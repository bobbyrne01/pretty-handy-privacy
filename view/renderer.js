const {ipcRenderer} = require('electron');
const {dialog} = require('electron').remote;
const Store = require('electron-store');
const store = new Store();
var recipients = store.get('recipients', {});
var privateKeys = store.get('privateKeys', {});

$(function () {
    $('#copyToClipboard').tooltip({trigger: 'manual'});
    $('#copyToClipboard').click(function(){
        ipcRenderer.send('copyToClipboard', {
            text: document.getElementById('lastText').value
        });
        var tooltip = $(this);
        $('#copyToClipboard').html('<i class="fas fa-clipboard-check"></i>');
        $('#copyToClipboard').addClass('disabled');
        tooltip.tooltip('show');
        setTimeout(function(){
            tooltip.tooltip('hide');
            $('#copyToClipboard').html('<i class="far fa-copy"></i>');
            $('#copyToClipboard').removeClass('disabled');
        }, 4000);
    });

    $('#windowWidth').val(parseInt(store.get('windowWidth', 1000)));
    $('#windowWidth').change(function() {
        store.set('windowWidth', $('#windowWidth').val());
        ipcRenderer.send('resizeWindow');
    });

    $('#windowHeight').val(parseInt(store.get('windowHeight', 600)));
    $('#windowHeight').change(function() {
        store.set('windowHeight', $('#windowHeight').val());
        ipcRenderer.send('resizeWindow');
    });

    $('#cancelRecipients').click(function(){
        document.getElementById('encryptForm').style.display = 'none';
        document.getElementById('encryptMessageForm').style.display = 'inline';
        document.getElementById('plainText').focus();
    });
    
    $('#copyEncryptedMsgToClipboard').change(function(event) {
        if (event.target.checked) {
            store.set('copyEncryptedMsgToClipboard', true);
        } else {
            store.set('copyEncryptedMsgToClipboard', false);
        }
    });
    
    document.getElementById('plainText').addEventListener('keyup', function() {
        if (document.getElementById('plainText').value === '') {
            document.getElementById('selectRecipients').classList.add('disabled');
        } else {
            document.getElementById('selectRecipients').classList.remove('disabled');
        }
    });
    
    $('#selectRecipients').click(function(){
        document.getElementById('encryptMessageForm').style.display = 'none';
        document.getElementById('encryptForm').style.display = 'inline';
        buildRecipientsList();
        privateKeys = store.get('privateKeys', {});
        document.getElementById('encrypt').classList.add('disabled');
        document.getElementById('passphrase').value = '';
        if (Object.keys(privateKeys).length === 0) {
            document.getElementById('signMessage').disabled = true;
            document.getElementById('passphrase').style.visibility = 'hidden';
        } else {
            document.getElementById('signMessage').disabled = false;
            if (document.getElementById('signMessage').checked) {
                document.getElementById('passphrase').style.visibility = 'visible';
            } else {
                document.getElementById('passphrase').style.visibility = 'hidden';
            }
        }
    });
    
    $('#signMessage').change(function() {
        if (document.getElementById('signMessage').checked) {
            document.getElementById('passphrase').style.visibility = 'visible';
        } else {
            document.getElementById('passphrase').style.visibility = 'hidden';
        }
    });
    
    $('#encrypt').click(function(){
        var firstElementWithClass = document.querySelector('.table-primary');
        var userId = firstElementWithClass.children[0].textContent + '<' + firstElementWithClass.children[1].textContent + '>';
        var passphrase = document.getElementById('passphrase').value;
        document.getElementById('passphrase').value = '';
        ipcRenderer.send('encrypt', {
            userId: userId,
            plainText: document.getElementById('plainText').value,
            passphrase: passphrase,
            signMessage: document.getElementById('signMessage').checked
        });
    });
    
    $('#decrypt').click(function() {
        var cipherText = document.getElementById('cipherText').value;
        var decryptPassphase = document.getElementById('decryptPassphase').value;
        ipcRenderer.send('decrypt', {
            cipherText: cipherText,
            decryptPassphase: decryptPassphase
        });
    });
    
    $('#showEncryptView').click(function(){
        displayEncryptView();
    });
    
    $('#showLastView').click(function(){
        displayLastEncryptedView();
    });
    
    $('#showDecryptView').click(function() {
        displayDecryptedView();
    });
    
    $('#showAddressBookView').click(function(){
        displayAddressBookView();
    });
    
    $('#loadPublicKey').click(function(){
        openDialogForKeySelection('publicKeySelectedFromFS');
    });
    
    $('#showSettingsView').click(function(){
        displaySettingsView();
    });
    
    $('#showPrivateKeyView').click(function(){
        displayPrivateKeyView();
    });
    
    $('#loadPrivateKey').click(function(){
        openDialogForKeySelection('privateKeySelectedFromFS');
    });
});

ipcRenderer.on('display-encrypt-message-ui', (event) => {
    document.getElementById('selectRecipients').disabled = true;
    $('#plainText').val('');
    displayEncryptView();
});

ipcRenderer.on('display-recipient-selection-ui', (event, message) => {
    buildRecipientsList();

    $('#encryptView').show();
    $('#encryptMessageForm').hide();
    $('#encryptForm').show();
    $('#lastView').hide();
    $('#decryptView').hide();
    $('#privateKeyView').hide();
    $('#addressBookView').hide();
    $('#settingsView').hide();

    document.getElementById('plainText').value = message.clipboardContents;
    if (Object.keys(privateKeys).length === 0) {
        document.getElementById('signMessage').disabled = true;
        $('#passphrase').hide();
    } else {
        document.getElementById('signMessage').disabled = false;
        $('#passphrase').show();
    }
});

ipcRenderer.on('display-latest-ui', (event) => {
    displayLastEncryptedView();
});

ipcRenderer.on('display-decrypt-ui', (event) => {
    displayDecryptedView();
});

ipcRenderer.on('display-decrypt-with-clipboard-ui', (event, message) => {
    displayDecryptedView();
    $('#cipherText').val(message.clipboardContents);
});

ipcRenderer.on('display-private-key-ui', (event) => {
    displayPrivateKeyView();
});

ipcRenderer.on('display-address-book-ui', (event) => {
    displayAddressBookView();
});

ipcRenderer.on('display-settings-ui', (event) => {
    displaySettingsView();
});

ipcRenderer.on('publicKeyReadFromFS', (event) => {
    setTimeout(function() {
        buildAddressBookRecipientsList();
    }, 100);
});

ipcRenderer.on('privateKeyReadFromFS', (event, message) => {
    setTimeout(function() {
        buildPrivateKeyList();
    }, 100);
});

ipcRenderer.on('encrypted', (event, message) => {
    $('#lastText').val(message.asciiArmoredMessage);
    document.getElementById('showLastView').classList.add('active');
    document.getElementById('showEncryptView').classList.remove('active');

    document.getElementById('lastView').style.display = 'inline';
    document.getElementById('encryptView').style.display = 'none';
});

ipcRenderer.on('decrypted', (event, message) => {
    document.getElementById('lastText').value = message.message;
    document.getElementById('showLastView').classList.add('active');
    document.getElementById('showEncryptView').classList.remove('active');

    document.getElementById('lastView').style.display = 'inline';
    document.getElementById('decryptView').style.display = 'none';
});

ipcRenderer.on('errorDecryptingPrivateKey', (event, message) => {
    document.getElementById(message.statusElementId).textContent = 'Error decrypting private key!';
    setTimeout(function() {
        document.getElementById(message.statusElementId).textContent = ''; 
    }, 4000);
});

function openDialogForKeySelection(eventName) {
    dialog.showOpenDialog({
        properties: ['openFile']
    }, function (file) {
        if (file !== undefined && file[0]) {
            ipcRenderer.send(eventName, {
                absoluteFilePath: file[0]
            });
        }
    });
}

function displayEncryptView() {
    $('#encryptView').show();
    $('#encryptMessageForm').show();
    $('#encryptForm').hide();
    $('#lastView').hide();
    $('#decryptView').hide();
    $('#privateKeyView').hide();
    $('#addressBookView').hide();
    $('#settingsView').hide();

    $('#showEncryptView').addClass('active');
    $('#showDecryptView').removeClass('active');
    $('#showLastView').removeClass('active');
    $('#showAddressBookView').removeClass('active');
    $('#showPrivateKeyView').removeClass('active');
    $('#showSettingsView').removeClass('active');

    $('#plainText').focus();
}

function displayLastEncryptedView() {
    $('#encryptView').show();
    $('#encryptMessageForm').hide();
    $('#encryptForm').hide();
    $('#lastView').show();
    $('#decryptView').hide();
    $('#privateKeyView').hide();
    $('#addressBookView').hide();
    $('#settingsView').hide();

    $('#showEncryptView').removeClass('active');
    $('#showDecryptView').removeClass('active');
    $('#showLastView').addClass('active');
    $('#showAddressBookView').removeClass('active');
    $('#showPrivateKeyView').removeClass('active');
    $('#showSettingsView').removeClass('active');

    $('#lastText').focus();
}

function displayDecryptedView() {
    $('#encryptView').hide();
    $('#lastView').hide();
    $('#decryptView').show();
    $('#privateKeyView').hide();
    $('#addressBookView').hide();
    $('#settingsView').hide();

    $('#showEncryptView').removeClass('active');
    $('#showLastView').removeClass('active');
    $('#showDecryptView').addClass('active');
    $('#showAddressBookView').removeClass('active');
    $('#showPrivateKeyView').removeClass('active');
    $('#showSettingsView').removeClass('active');

    $('#cipherText').focus();
}

function displayPrivateKeyView() {
    buildPrivateKeyList();
    
    $('#encryptView').hide();
    $('#lastView').hide();
    $('#decryptView').hide();
    $('#privateKeyView').show();
    $('#addressBookView').hide();
    $('#settingsView').hide();

    $('#showEncryptView').removeClass('active');
    $('#showDecryptView').removeClass('active');
    $('#showLastView').removeClass('active');
    $('#showAddressBookView').removeClass('active');
    $('#showPrivateKeyView').addClass('active');
    $('#showSettingsView').removeClass('active');

    if (Object.keys(privateKeys).length > 0) {
        $('#loadPrivateKey').addClass('disabled');
    }
}

function displayAddressBookView() {
    buildAddressBookRecipientsList();

    $('#encryptView').hide();
    $('#lastView').hide();
    $('#decryptView').hide();
    $('#privateKeyView').hide();
    $('#addressBookView').show();
    $('#settingsView').hide();

    $('#showEncryptView').removeClass('active');
    $('#showDecryptView').removeClass('active');
    $('#showLastView').removeClass('active');
    $('#showAddressBookView').addClass('active');
    $('#showPrivateKeyView').removeClass('active');
    $('#showSettingsView').removeClass('active');
}

function displaySettingsView() {
    $('#encryptView').hide();
    $('#lastView').hide();
    $('#decryptView').hide();
    $('#privateKeyView').hide();
    $('#addressBookView').hide();
    $('#settingsView').show();

    $('#showEncryptView').removeClass('active');
    $('#showDecryptView').removeClass('active');
    $('#showLastView').removeClass('active');
    $('#showAddressBookView').removeClass('active');
    $('#showPrivateKeyView').removeClass('active');
    $('#showSettingsView').addClass('active');
}

function appendRecipientsToTable(recipients, tbody, appendActions) {
    for (var recipient in recipients) {
        var row = $('<tr>');
        row.append($('<td>').text((recipients[recipient].name !== '' ? recipients[recipient].name : '')));
        row.append($('<td>').text((recipients[recipient].email !== '' ? recipients[recipient].email : '')));
        if (appendActions) {
            row.append($('<td>').html('<button class="btn btn-sm btn-secondary" data-toggle="tooltip" data-placement="top" title="Copied to clipboard!"><i class="far fa-copy"></i></button><button class="btn btn-sm btn-danger"><i class="fas fa-trash-alt"></i></button>'));
        }
        tbody.append(row);
    }
}

function buildRecipientsList() {
    $('#recipients').html('');
    var recipients = store.get('recipients', {});
    appendRecipientsToTable(recipients, $('#recipients'), false);
    addRowHandlers();
    document.getElementById('encrypt').disabled = document.getElementById('recipients').innerHTML === '' ? true : false;
}

function buildAddressBookRecipientsList() {
    document.getElementById('addressBookRecipients').innerHTML = '';
    var recipients = store.get('recipients', {});
    appendRecipientsToTable(recipients, $('#addressBookRecipients'), true);
    addRowExportHandler();
    addRowDeletionHandler();
}

function buildPrivateKeyList() {
    document.getElementById('privateKeys').innerHTML = '';
    var privateKeys = store.get('privateKeys', {});
    for (var privateKey in privateKeys) {
        var newRow = '<tr>';
        var cols = '';
        cols += '<td>' + (privateKeys[privateKey].name !== '' ? privateKeys[privateKey].name : '') + '</td>';
        cols += '<td>' + (privateKeys[privateKey].email !== '' ? privateKeys[privateKey].email : '') + '</td>';
        cols += '<td><button id="copyPrivateKey" class="btn btn-sm btn-secondary" data-toggle="tooltip" data-placement="top" title="Copied to clipboard!"><i class="far fa-copy"></i></button>';
        cols += '<button class="btn btn-sm btn-danger"><i class="fas fa-trash-alt"></i></button></td>';
        newRow += cols + '</tr>';
        document.getElementById('privateKeys').innerHTML += newRow;
    }
    if (document.getElementById('privateKeysTable').rows.length > 0) {
        document.getElementById('loadPrivateKey').classList.add('disabled');
    }
    addPrivateKeyDeletionHandlers();
    addPrivateKeyCopyHandlers();
}

function clearRowSelection() {
    const rows = Array.from(document.querySelectorAll('tr.table-primary'));
    for (var i = 0; i < rows.length; i++) {
        rows[i].classList.remove('table-primary');
    }
}

function addRowExportHandler() {
    $('#addressBookRecipientsTable > tbody  > tr').each(function(index, element) {
        $(element.children[2].children[0]).tooltip({trigger: 'manual'});
        $(element.children[2].children[0]).click(function(){
            var name = this.parentElement.parentElement.children[0].textContent;
            var email = this.parentElement.parentElement.children[1].textContent;
            var userId = name + '<' + email + '>';
            recipients = store.get('recipients', recipients);
            ipcRenderer.send('copyToClipboard', {
                text: recipients[userId].pubkey
            });
            var tooltip = $(this);
            $(element.children[2].children[0]).html('<i class="fas fa-clipboard-check"></i>');
            $(element.children[2].children[0]).addClass('disabled');
            tooltip.tooltip('show');
            setTimeout(function(){
                tooltip.tooltip('hide');
                $(element.children[2].children[0]).html('<i class="far fa-copy"></i>');
                $(element.children[2].children[0]).removeClass('disabled');
            }, 4000);
        });
    });
}

function addRowDeletionHandler() {
    var rows = document.getElementById('addressBookRecipientsTable').rows;
    for (i = 0; i < rows.length; i++) {
        rows[i].children[2].children[1].onclick = function(){ 
            return function(){
                var name = this.parentElement.parentElement.children[0].textContent;
                var email = this.parentElement.parentElement.children[1].textContent;
                var userId = name + '<' + email + '>';
                delete recipients[userId];
                store.set('recipients', recipients);
                buildAddressBookRecipientsList();
            };
        }(rows[i]);
    }
}

function addPrivateKeyDeletionHandlers() {
    var rows = document.getElementById('privateKeysTable').rows;
    for (i = 0; i < rows.length; i++) {
        rows[i].children[2].children[1].onclick = function(){ 
            return function(){
                var name = this.parentElement.parentElement.children[0].textContent;
                var email = this.parentElement.parentElement.children[1].textContent;
                var userId = name + '<' + email + '>';
                delete privateKeys[userId];
                store.set('privateKeys', privateKeys);
                buildPrivateKeyList();
                document.getElementById('loadPrivateKey').classList.remove('disabled');
            };
        }(rows[i]);
    }
}

function addPrivateKeyCopyHandlers() {
    $('#copyPrivateKey').tooltip({trigger: 'manual'});
    $('#copyPrivateKey').click(function(){
        var name = this.parentElement.parentElement.children[0].textContent;
        var email = this.parentElement.parentElement.children[1].textContent;
        var userId = name + '<' + email + '>';
        privateKeys = store.get('privateKeys', privateKeys);
        ipcRenderer.send('copyToClipboard', {
            text: privateKeys[userId].privkey
        });
        var tooltip = $(this);
        $('#copyPrivateKey').html('<i class="fas fa-clipboard-check"></i>');
        $('#copyPrivateKey').addClass('disabled');
        tooltip.tooltip('show');
        setTimeout(function(){
            tooltip.tooltip('hide');
            $('#copyPrivateKey').html('<i class="far fa-copy"></i>');
            $('#copyPrivateKey').removeClass('disabled');
        }, 4000);
    });
}

function addRowHandlers() {
    var rows = document.getElementById('recipientsTable').rows;
    for (i = 0; i < rows.length; i++) {
        rows[i].onclick = function(){ 
            return function(){
                clearRowSelection();
                this.classList.toggle('table-primary');
                document.getElementById('encrypt').classList.remove('disabled');
            };
        }(rows[i]);
    }
}