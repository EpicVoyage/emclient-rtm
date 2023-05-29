import {glob} from "glob";
require('dotenv').config();
const sendmail = require('sendmail')({silent: true});

// Change the current working directory to the parent directory (ts file root).
process.chdir(__dirname + '/..');

let throttled = false;

// Wrap sendmail in a promise.
function sendmailPromise(mailOptions: any) {
	return new Promise((resolve, reject) => {
		sendmail(mailOptions, (err: any, reply: any) => {
			if (err) {
				reject(err);
			} else {
				resolve(reply);
			}
		});
	});
}

async function index() {
	const sqlite3 = require('sqlite3').verbose();
	const cache = new sqlite3.Database('cache.sqlite', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
	cache?.serialize((): void => {
		cache?.run(`CREATE TABLE IF NOT EXISTS "cache" (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				mailid NUMERIC,
				date DATETIME DEFAULT CURRENT_TIMESTAMP,
				subject TEXT DEFAULT CURRENT_TIMESTAMP
			)`);
	});

	const dbFiles = await glob(process.env.EMCLIENT_INDEX || __dirname+'/**/mail_index.dat')
	for (const dbFile of dbFiles) {
		console.log('Opening database file: ' + dbFile);
		try {
			// Open the sqlite database file read-only
			// const sqlite3 = require('sqlite3').verbose();
			const db = new sqlite3.Database(dbFile, sqlite3.OPEN_READONLY);

			db?.all(`SELECT mi.id, mi.date, mi.subject, mi.preview, ma.displayName, ma.address
							FROM FlaggedMailItems fmi
							LEFT JOIN MailItems mi ON (mi.id = fmi.id)
							LEFT JOIN MailAddresses ma ON (ma.parentId = mi.id AND type = 1)`, (err: Error | null, rows: any) => {
				try {
					if (err) {
						console.error(dbFile, err);
					} else {
						for (const row of rows) {
							if (throttled) {
								break;
							}

							// Cache the row id to a local sqlite database. Check if it has already been included in the list.
							// If it has, skip it. If it hasn't, add it to the list.
							// console.log(row);

							// Check if the row id is in the cache database.
							cache?.get(`SELECT * FROM "cache" WHERE mailid = ? AND subject = ?`, [row.id, row.subject], (err: Error | null, cache_row: any) => {
								// If not found, add it to the cache database and add it to the list.
								if (!cache_row && !throttled) {
									// Send an email message to myself with the subject from the row.
									console.log('Sending email: ' + row.subject);
									sendmailPromise({
										from: process.env.MY_EMAIL,
										to: process.env.RTM_EMAIL,
										// TODO: convert row.date to format ^7Feb2023. How does eM Client encode this date?
										subject: (row.displayName ? row.displayName : row.address) + ' (email): ' + row.subject + ' ' + (process.env.RTM_TASK_SETTINGS || ''),
										html: row.preview + ' -- ' + row.displayName + '<' + row.address + '>',
									}).then((reply: any) => {
										console.dir('Reply: '+reply);

										cache?.run(`INSERT INTO "cache" (mailid, subject) VALUES (?, ?)`, [row.id, row.subject], (err: Error | null) => {
											if (err) {
												console.error(dbFile, err);
											} else {
												console.log('Added to cache: ' + row.subject);
											}
										});
									}).catch((err: any) => {
										console.log('Error: '+err.stack);
										throttled = true;
									});
								}
							});
						}
					}
				} catch (e) {
					console.error(dbFile, e);
				}
			});
		} catch (e) {
			console.error(dbFile, e);
		}
	}
}

index().then(() => {
	console.log('done');
});
