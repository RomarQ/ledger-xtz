Ledger Hardware Wallet XTZ JavaScript bindings.

## Install

```
npm i --save ledger-xtz
yarn add ledger-xtz
```

#### Examples

```javascript
import LedgerXTZ from "ledger-xtz";
const xtz = new LedgerXTZ();

xtz.getAddress("44h/1729h/0h/0h", true, 0x00);
```

#### getAddress

get Tezos address for a given BIP 32 path.

##### Parameters

-   `path` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** a path in BIP 32 format
-   `display` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)?** optionally enable or not the display
-   `curve` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)?** optional, the curve to use [ed25519 = 0x00, secp256k1 = 0x01, p256 = 0x02] `ed25519 is the default`


##### Examples

```javascript
// Get ed25519 address
const result = await xtz.getAddress("44h/1729h/0h/0h", true, 0x00);
const { publicKey, pkh } = result;
```

#### signOperation

Sign a Tezos operation with a given BIP 32 path

##### Parameters

-   `path` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** a path in BIP 32 format
-   `rawOpHex` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** a raw hex string of the bytes to sign
-   `curve` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)?** optional, the curve to use [ed25519 = 0x00, secp256k1 = 0x01, p256 = 0x02] `ed25519 is the default`

##### Examples

```javascript
const result = await xtz.signOperation("44'/1729'/0'/0'", "0x...<some bytes>...");
const { signature, encodedSignature, blake2bHash } = result;
```

#### getAppInformation

Get the version of the Tezos app installed on the hardware device

##### Examples

```javascript
const result = await xtz.getAppInformation();
const { version } = result;
```