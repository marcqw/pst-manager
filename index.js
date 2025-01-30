import { PSTMessage, PSTFile, PSTFolder } from 'pst-extractor';
import { resolve } from 'path';
import { Low } from 'lowdb';
import { JSONFilePreset } from 'lowdb/node'
import { nanoid } from 'nanoid';


const defaultData = { emails: [] }
const db = await JSONFilePreset('emails.json', defaultData)


// Fonction asynchrone pour initialiser la base de données
async function initDB() {
    await db.read();
    db.data ||= { emails: [] };  // Initialisez les données par défaut si elles n'existent pas
    await db.write();
}

let depth = -1;
let col = 0;

const pstFilePath = resolve('./utile.pst');
const pstFile = new PSTFile(pstFilePath);

// Initialiser la base de données et traiter le fichier PST
initDB().then(() => {
    console.log(pstFile.getMessageStore().displayName);
    processFolder(pstFile.getRootFolder()).then(() => {
        console.log('Traitement terminé.');
    });
});

/**
 * Traite un dossier et ses sous-dossiers de manière récursive
 * @param {PSTFolder} folder
 */
async function processFolder(folder) {
    depth++;

    // Affiche le nom du dossier si ce n'est pas le dossier racine
    if (depth > 0) {
        console.log(getDepth(depth) + folder.displayName);
    }

    // Parcourt les sous-dossiers
    if (folder.hasSubfolders) {
        let childFolders = folder.getSubFolders();
        for (let childFolder of childFolders) {
            await processFolder(childFolder);
        }
    }

    // Parcourt les emails dans ce dossier
    if (folder.contentCount > 0) {
        depth++;
        let email = folder.getNextChild();
        while (email != null) {
            console.log(getDepth(depth) + 
                'Sender: ' + email.senderName + 
                ', Subject: ' + email.subject + 
                ', Body: ' + email.body + 
                ', Date: ' + email.clientSubmitTime);
            await saveEmailToDB(email);
            email = folder.getNextChild();
        }
        depth--;
    }
    depth--;
}

/**
 * Enregistre un email dans la base de données
 * @param {PSTMessage} email
 */
async function saveEmailToDB(email) {
    // Préparez l'objet à enregistrer dans LowDB
    const emailData = {
        id: nanoid(),
        senderName: email.senderName,
        subject: email.subject,
        body: email.body,
        date: email.clientSubmitTime,
        depth: depth
    };

    // Insérez l'email dans la base de données
    db.data.emails.push(emailData);
    await db.write();
}

/**
 * Retourne une chaîne indiquant la profondeur dans l'arborescence
 * @param {number} depth
 * @returns {string}
 */
function getDepth(depth) {
    let sdepth = '';
    if (col > 0) {
        col = 0;
        sdepth += '\n';
    }
    for (let x = 0; x < depth - 1; x++) {
        sdepth += ' | ';
    }
    sdepth += ' |- ';
    return sdepth;
}