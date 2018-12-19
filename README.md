# Pretty Handy Privacy

Encourage public-key based encryption by providing easy access to basic encryption tasks.

The application uses [openpgpjs](https://github.com/openpgpjs/openpgpjs), an open source JS implementation of [OpenPGP](https://www.openpgp.org/).

# Features

* Encrypt plain text using a public key
* Encrypt clipboard contents using a public key
* Optionally, sign message using a private key
* Decrypt encrypted message using a private key
* Decrypt encrypted message in clipboard using a private key
* Automatically copy encrypted/decrypted message to clipboard
* Easy access to last encrypted/decrypted message, in case of mistake
* Address Book
 * Store multiple public keys (contacts)
 * Copy a public key to clipboard (export)
 * Delete public keys
 * Store single private key (for decrypting and/or signing during encryption)
* OS native tray icon for easy application access

# Donate

This open source project is done in free time. If you'd like more development, please [donate](https://www.paypal.me/bobbyrne01). Donation can be used to increase some issue priority.

# Dependencies

* [openpgpjs](https://github.com/openpgpjs/openpgpjs)
* [electron](https://github.com/electron/electron)
* [imagemagick](https://www.imagemagick.org/script/index.php)

# Attributions

Tray and app icon from [Font Awesome](https://fontawesome.com/icons/lock?style=solid)