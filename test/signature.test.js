import Datastore from 'nedb-promises';
import crypto from 'crypto';
import fetch from 'node-fetch';

const db = {
    'user': Datastore.create('./dbs/user.db'),
};

const createSignature = (...args) => crypto.createHash('sha256').update(args.join('')).digest('base64');

const user = await db.user.findOne({_id: "MllC2qBRaHeDxE78"});

console.log(user);
const timestamp = Math.floor(Date.now() / 1000);
const signature = {
    signature: createSignature(user.credential.token, timestamp),
    timestamp: timestamp,
    userId: user._id,
};

const req = {
    method: "GET",
    headers: {
        'accept': 'application/json',
        'signature': JSON.stringify(signature),
    }
};

fetch('http://localhost:3000/test', req)
    .then(res => res.json())
    .then(data => console.log('Result :', data))
    .catch(err => console.error(err));

