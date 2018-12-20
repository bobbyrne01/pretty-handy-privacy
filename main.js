const {app, BrowserWindow, clipboard, ipcMain, Menu, shell, Tray} = require('electron');
var path = require('path');
const openpgp = require('openpgp');
const fs = require('fs');
const notifier = require('node-notifier');
const Store = require('electron-store');
var log = require('electron-log');
const store = new Store();
var recipients = store.get('recipients', {});
var privateKeys = store.get('privateKeys', {});
var encryptClipboard = false;
openpgp.initWorker({path:'openpgp.worker.js'});
let window;
var tray;
const APP_NAME = 'Pretty Handy Privacy';
const WINDOW_WIDTH_PREF_NAME = 'windowWidth';
const WINDOW_HEIGHT_PREF_NAME = 'windowHeight';
const DISPLAY_ENCRYPT_UI = 'display-encrypt-message-ui';
const DISPLAY_RECIPIENT_UI = 'display-recipient-selection-ui';
const DISPLAY_DECRYPT_UI = 'display-decrypt-ui';
const DISPLAY_DECRYPT_WITH_CLIPBOARD_UI = 'display-decrypt-with-clipboard-ui';
const DISPLAY_LATEST_UI = 'display-latest-ui';
const DISPLAY_PRIVATE_KEY_UI = 'display-private-key-ui';
const DISPLAY_ADDRESS_BOOK_UI = 'display-address-book-ui';
const DISPLAY_SETTINGS_UI = 'display-settings-ui';
const PUBLIC_KEY_SELECTED = 'publicKeySelectedFromFS';
const PRIVATE_KEY_SELECTED = 'privateKeySelectedFromFS';
const PUBLIC_KEY_STORED = 'publicKeyReadFromFS';
const PRIVATE_KEY_STORED = 'privateKeyReadFromFS';
const ERROR_DECRYPTING_PRIVATE_KEY = 'errorDecryptingPrivateKey';
const ENCRYPTED = 'encrypted';
const DECRYPTED = 'decrypted';
const COPY_TO_CLIPBOARD = 'copyToClipboard';
const COPY_RESULT_TO_CLIPBOARD_PREF_NAME = 'copyEncryptedMsgToClipboard';
const RESIZE_WINDOW = 'resizeWindow';
const ENCRYPT = 'encrypt';
const DECRYPT = 'decrypt';

function initWindow() {
    window = new BrowserWindow({
      width: parseInt(store.get(WINDOW_WIDTH_PREF_NAME, 1000)), 
      height: parseInt(store.get(WINDOW_HEIGHT_PREF_NAME, 600)),
      show: false,
      skipTaskbar: true,
      title: APP_NAME
    });
    window.loadFile('view/index.html');
    window.on('closed', initWindow);
}

function createWindow () {
  if (process.platform !== 'darwin') {
    app.dock.hide();
  }
  initWindow();
  tray = new Tray(path.join(__dirname, 'trayIcon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Encrypt message',
      click: function() {
        encryptClipboard = false;
        window.show();
        window.webContents.send(DISPLAY_ENCRYPT_UI);
      }
    },
    {
      label: 'Encrypt clipboard',
      click: function() {
        encryptClipboard = true;
        window.show();
        window.webContents.send(DISPLAY_RECIPIENT_UI, {
          clipboardContents: clipboard.readText('selection')
        });
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Decrypt message',
      click: function() {
        encryptClipboard = false;
        window.show();
        window.webContents.send(DISPLAY_DECRYPT_UI);
      }
    },
    {
      label: 'Decrypt clipboard',
      click: function() {
        encryptClipboard = false;
        window.show();
        window.webContents.send(DISPLAY_DECRYPT_WITH_CLIPBOARD_UI, {
          clipboardContents: clipboard.readText('selection')
        });
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Latest',
      click: function() {
        encryptClipboard = false;
        window.show();
        window.webContents.send(DISPLAY_LATEST_UI);
      }
    },
    {
      label: 'Private Key',
      click: function() {
        encryptClipboard = false;
        window.show();
        window.webContents.send(DISPLAY_PRIVATE_KEY_UI);
      }
    },
    {
      label: 'Address Book',
      click: function() {
        encryptClipboard = false;
        window.show();
        window.webContents.send(DISPLAY_ADDRESS_BOOK_UI);
      }
    },
    {
      label: 'Settings',
      click: function() {
        encryptClipboard = false;
        window.show();
        window.webContents.send(DISPLAY_SETTINGS_UI);
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'About',
      click: function() {
        shell.openExternal('https://github.com/bobbyrne01/pretty-handy-privacy');
      }
    },
    {
      label: 'Donate',
      click: function() {
        shell.openExternal('https://www.paypal.me/bobbyrne01');
      }
    },
    {
      label: 'Quit',
      role: 'quit'
    }
  ]);
  tray.setContextMenu(contextMenu);

  const template = [
    {
      label: 'Edit',
      submenu: [
        {
          role: 'undo'
        },
        {
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          role: 'cut'
        },
        {
          role: 'copy'
        },
        {
          role: 'paste'
        },
        {
          role: 'pasteandmatchstyle'
        },
        {
          role: 'delete'
        },
        {
          role: 'selectall'
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  ipcMain.on(PUBLIC_KEY_SELECTED,function(event, message) {
    var absoluteFilePath = message.absoluteFilePath;
    if (fs.existsSync(absoluteFilePath)) {
      fs.readFile(absoluteFilePath, 'utf8', function(err, pubkey) {
        if (!err) {
          var userId = storeKey(pubkey, recipients, 'pubkey', 'recipients', store);
          event.sender.send(PUBLIC_KEY_STORED, {
            userId: userId
          });
        } else {
          log.error('Error reading public key file at: ' + absoluteFilePath);
        }
      });
    } else {
      log.error('Error, public key not found at: ' + absoluteFilePath);
    }
  });

  ipcMain.on(PRIVATE_KEY_SELECTED,function(event, message) {
    var absoluteFilePath = message.absoluteFilePath;
    if (fs.existsSync(absoluteFilePath)) {
      fs.readFile(absoluteFilePath, 'utf8', function(err, privkey) {
        if (!err) {
          var userId = storeKey(privkey, privateKeys, 'privkey', 'privateKeys', store);
          event.sender.send(PRIVATE_KEY_STORED, {
            userId: userId
          });
        } else {
          log.error('Error reading private key file at: ' + absoluteFilePath);
        }
      });
    } else {
      log.error('Error, private key not found at: ' + absoluteFilePath);
    }
  });

  ipcMain.on(COPY_TO_CLIPBOARD, function(event, message) {
    clipboard.writeText(message.text, 'selection');
  });

  ipcMain.on(RESIZE_WINDOW, function(event) {
    resizeWindow(window);
  });

  ipcMain.on(ENCRYPT, function(event, message) {
    const encrypt = async function() {
      var plainText = encryptClipboard ? clipboard.readText('selection') : message.plainText;
      var options = {};
      if (Object.keys(privateKeys).length !== 0 && message.signMessage) {
        for (var privateKey in privateKeys) {
          var asciiArmoredPrivateKey = privateKeys[privateKey].privkey;
          const privKeyObj = (await openpgp.key.readArmored(asciiArmoredPrivateKey)).keys[0];
          await privKeyObj.decrypt(message.passphrase).catch(function() {
            log.warn('Error decrypting private key using passphrase.');
            event.sender.send(ERROR_DECRYPTING_PRIVATE_KEY, {
              statusElementId: 'signPassphraseError'
            });
          });
          options = {
            message: openpgp.message.fromText(plainText),
            publicKeys: (await openpgp.key.readArmored(recipients[message.userId].pubkey)).keys,
            privateKeys: [privKeyObj]
          }
        }
      } else {
        options = {
          message: openpgp.message.fromText(plainText),
          publicKeys: (await openpgp.key.readArmored(recipients[message.userId].pubkey)).keys
        }
      }
      openpgp.encrypt(options).then(ciphertext => {
        encrypted = ciphertext.data;
        return encrypted;
      })
      .then(encrypted => {
        copyToClipboardAndNotify(encrypted);
        event.sender.send(ENCRYPTED, {
          asciiArmoredMessage: encrypted
        });
      })
      .catch(function(error) {
        log.error('Error encrypting message, full error to follow.');
        log.error(error);
      });
    }
    encrypt();
  });

  ipcMain.on(DECRYPT, function(event, details) {
    const decrypt = async function() {
      var cipherText = details.cipherText;
      var decryptPassphase = details.decryptPassphase;
      var asciiArmoredPrivateKey;
      for (var privateKey in privateKeys) {
        asciiArmoredPrivateKey = privateKeys[privateKey].privkey;
      }
      const privKeyObj = (await openpgp.key.readArmored(asciiArmoredPrivateKey)).keys[0];
      await privKeyObj.decrypt(decryptPassphase).catch(function() {
        log.warn('Error decrypting private key using passphrase.');
        event.sender.send(ERROR_DECRYPTING_PRIVATE_KEY, {
          statusElementId: 'decryptPassphraseError'
        });
      });
      const options = {
        message: await openpgp.message.readArmored(cipherText),
        privateKeys: [privKeyObj]
      }
      openpgp.decrypt(options).then(function(plaintext) {
        return plaintext.data;
      })
      .then(function(decrypted) {
        copyToClipboardAndNotify(decrypted);
        event.sender.send(DECRYPTED, {
          message: decrypted
        });
      })
      .catch(function(error) {
        log.error('Error decrypting message, full error to follow.');
        log.error(error);
      });
    }
    decrypt();
  });
}

app.on('ready', createWindow)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('activate', function () {
  if (window === null) {
    createWindow();
  }
});

function copyToClipboardAndNotify(encrypted) {
  var copyEncryptedMsgToClipboard = store.get(COPY_RESULT_TO_CLIPBOARD_PREF_NAME, true);
  if (copyEncryptedMsgToClipboard) {
    clipboard.writeText(encrypted, 'selection');
    notifier.notify({
      title: APP_NAME,
      message: 'Clipboard updated.'
    });
  }
}

function resizeWindow(window) {
  var windowWidth = parseInt(store.get(WINDOW_WIDTH_PREF_NAME, 1000));
  var windowHeight = parseInt(store.get(WINDOW_HEIGHT_PREF_NAME, 600));
  window.setSize(windowWidth, windowHeight);
}

var storeKey = async(key, existingKeys, keyFieldName, preferenceFieldName, store) => {
  var parsedKeys = await openpgp.key.readArmored(key);
  var name = parsedKeys.keys[0].users[0].userId.name;
  var email = parsedKeys.keys[0].users[0].userId.email;
  var userId = name + '<' + email + '>';
  existingKeys[userId] = {
    name: name,
    email: email
  };
  existingKeys[userId][keyFieldName] = key;
  store.set(preferenceFieldName, existingKeys);
  return userId;
}