import BIPPath from 'bip32-path';
import { Curves, encodeToBase58, encodeSignature, getOperationHash } from './utils';
import TransportWeb from "@ledgerhq/hw-transport-webhid";
import { Buffer } from 'buffer';
import { listen } from "@ledgerhq/logs";

const LEDGER_DEBUG = false;
if (LEDGER_DEBUG) {
  listen(({ id, date, type, message, ...rest }) => {
    console.debug({
      message: type + (message ? ": " + message : ""),
      ...rest,
    });
  });
}

/**
 * Tezos API
 */
export default class LedgerXTZ {
  transport: any = undefined;

  constructor() {
    TransportWeb.create()
      .then((transport) => {
        this.transport = transport;
        this.transport.decorateAppAPIMethods(
          this,
          ['getAddress', 'signOperation', 'getAppInformation'],
          'XTZ'
        );
      })
      .catch((e) => LEDGER_DEBUG && console.error(e));
  }

  ready() {
    return !!this.transport;
  }

  /**
   * get Tezos address for a given BIP 32 path.
   *
   * @param path a path in BIP 32 format
   * @param {boolean} [display] optionally enable or not the display
   * @param {number} [curve] optional, the curve to use [ed25519, secp256k1, p256] (ed25519 is default)
   * @return an object with a publicKey, address and (optionally) chainCode
   * @example
   * const result = await xtz.getAddress("44'/1729'/0'/0'");
   * const { publicKey, address } = result;
   */
  async getAddress(
    path: string,
    display: boolean = true,
    curve: number = Curves.ED25519
  ): Promise<AddressResponse> {
    /**
     * CURVES (ed25519 is the default)
     *
     * 0x00 -> tz1 -> ed25519
     * 0x01 -> tz2 -> secp256k1
     * 0x02 -> tz3 -> p256
     */

    const bipPath = BIPPath.fromString(path).toPathArray();
    const cla = 0x80;

    /**
     * Instruction code
     *
     * 0x03 -> INS_PROMPT_PUBLIC_KEY
     * 0x02 -> INS_GET_PUBLIC_KEY
     */
    const ins = display ? 0x03 : 0x02;

    /**
     *	P1_FIRST 0x00
     *	P1_NEXT 0x01
     *	P1_HASH_ONLY_NEXT 0x03
     *	P1_LAST_MARKER 0x81
     */
    const p1 = 0x00;
    const p2 = curve;

    const data = Buffer.alloc(1 + bipPath.length * 4);

    data.writeInt8(bipPath.length, 0);
    bipPath.forEach((segment: number, index: number) => {
      data.writeUInt32BE(segment, 1 + index * 4);
    });

    const response = await this.transport.send(cla, ins, p1, p2, data);

    const publicKeyLength = response[0];
    const publicKey = response.slice(1, 1 + publicKeyLength);

    return encodeToBase58(Buffer.from(publicKey), curve);
  }

  /**
   * Sign a Tezos transaction with a given BIP 32 path
   *
   * @param path a path in BIP 32 format
   * @param rawOpHex a raw hex string of the bytes to sign
   * @param {number} [curve] optional, the curve to use [ed25519, secp256k1, p256] (ed25519 is default)
   * @return a signature as hex string
   * @example
   * const signature = await xtz.signOperation("44'/1729'/0'/0'", "some bytes");
   */
  async signOperation(
    path: string,
    rawOpHex: string,
    curve: number = Curves.ED25519
  ): Promise<any> {
    const bipPath = BIPPath.fromString(path).toPathArray();
    const rawOp = Buffer.concat([Buffer.from([0x03]), Buffer.from(rawOpHex, 'hex')]);

    const apdus: APDU[] = [];
    let offset = 0;

    const apdu: APDU = {
      cla: 0x80,
      ins: 0x04,
      p1: 0x00,
      p2: curve,
      data: Buffer.alloc(1 + bipPath.length * 4),
    };
    apdu.data.writeInt8(bipPath.length, 0);
    bipPath.forEach((segment: number, index: number) => {
      apdu.data.writeUInt32BE(segment, 1 + index * 4);
    });
    apdus.push(apdu);

    const maxChunkSize = 230;
    while (offset !== rawOp.length) {
      const chunkSize = offset + maxChunkSize > rawOp.length ? rawOp.length - offset : maxChunkSize;

      const apdu = {
        cla: 0x80,
        ins: 0x04,
        p1: offset + chunkSize === rawOp.length ? 0x81 : 0x01,
        p2: curve,
        data: Buffer.alloc(chunkSize),
      };

      rawOp.copy(apdu.data, 0, offset, offset + chunkSize);

      apdus.push(apdu);
      offset += chunkSize;
    }

    let response = Buffer.alloc(0);
    for (let apdu of apdus) {
      response = await this.transport.send(apdu.cla, apdu.ins, apdu.p1, apdu.p2, apdu.data);
    }

    let signature: Buffer;
    if (curve == Curves.ED25519) {
      // ed25519 signature is already formatted.
      signature = response.slice(0, response.length - 2);
    } else {
      signature = Buffer.alloc(64).fill(0);

      const r = signature.subarray(0, 32);
      const s = signature.subarray(32, 64);

      // Used to read byte by byte
      let index = 0;

      const frameType = response.readUInt8(index++);
      if (frameType !== 0x31 && frameType !== 0x30) {
        throw new Error('Wrong frame type, could not get signature.');
      }

      if (response.readUInt8(index++) + 4 != response.length) {
        throw new Error(
          `Wrong signature length, expected ${response.length} and got ${
            response.readUInt8(index - 1) + 4
          }`
        );
      }

      if (response.readUInt8(index++) != 0x02) {
        throw new Error('Could not get signature.');
      }

      let rlength = response.readUInt8(index++);
      if (rlength > 32) {
        index += rlength - 32;
        rlength = 32;
      }
      response.copy(r, 32 - rlength, index, index + rlength);
      index += rlength;

      if (response.readUInt8(index++) != 0x02) {
        throw new Error('Could not get signature.');
      }

      let sLength = response.readUInt8(index++);

      if (sLength > 32) {
        index += sLength - 32;
        sLength = 32;
      }
      response.copy(s, 32 - sLength, index, index + sLength);
      index += sLength;

      if (index !== response.length - 2) {
        throw new Error('Could not get signature.');
      }
    }

    const hexSignature = signature.toString('hex');
    return {
      signature: hexSignature,
      encodedSignature: encodeSignature(hexSignature, curve),
      blake2bHash: getOperationHash(rawOpHex)
    };
  }

  /**
   * get the version of the Tezos app installed on the hardware device
   *
   * @return an object with a version
   * @example
   * const result = await xtz.getAppInformation();
   *
   * {
   *   "version": "2.2.5"
   * }
   */
  async getAppInformation(): Promise<AppInformation> {
    const response = await this.transport.send(0x80, 0x00, 0x00, 0x00);
    const result: AppInformation = {
      version: response[1] + '.' + response[2] + '.' + response[3],
    };
    return result;
  }

  /**
   * Get the operation blake2b hash (with watermark) [size -> 32]
   */
  getOperationHash = getOperationHash;
}

interface AddressResponse {
  publicKey: string;
  pkh: string;
  chainCode?: string;
}

interface AppInformation {
  version: string;
}

interface APDU {
  cla: number;
  ins: number;
  p1: number;
  p2: number;
  data: Buffer;
}
