import express from 'express';
import Datastore from 'nedb-promises';
import crypto from 'crypto';
import cors from 'cors';

// declare app and settings
const app = express();
const port = 3000;

// middleware
app.use(express.json());
app.use(cors());

// declare db
const db = {
    'user': Datastore.create('./dbs/user.db'),
};

function isValidSignature({ signature, timestamp, userId }) {

    if(Math.floor(Date.now() / 1000) - timestamp > 1)
        return new Promise(resolve => resolve("Signature no longer valid"));

    return db.user.findOne({_id: userId})
        .then(user => {
                if(!user) return 'No user match given _id';
                if(user.credential?.expire_at < Date.now()) return "Token for given user is no longer valid";

                const toHash = `${user.credential?.token}${timestamp}`;
                const validSignature = crypto.createHash('sha256').update(toHash).digest('base64');
                
                if(validSignature === signature) return true;
                return "Signature doesn't match expectaed statement";
            }   
        )
        .catch(err => console.error(err));
                    

}

app.post('/login', async (req, res) => {
    if(!req.body || !(req.body.username && req.body.password)) return res.status(400).json("Wrong data format");
    
    const [username, password] = [req.body.username, req.body.password];
    const user = await db.user.findOne({username: username});

    if(!user) return res.status(400).json("No user find with given username");
    if(user.password !== password) return res.status(400).json("Wrong password for given user");

    const input = `${username}-${password}-${Date.now()}`;
    const token = crypto.createHash('sha256').update(input).digest('base64');
    const expire_at = Date.now() + 1000*60*60;

    return db.user.update({_id: user._id}, {$set: { "credential.token": token, "credential.expire_at": expire_at }}, {})
        .then(() => db.user.findOne({_id: user._id})
            .then(user => res.status(200).json({
                    id: user._id,
                    username: user.username,
                    credential: user.credential,
                })
            ).catch(err => { throw(err) })
        )
        .then(db.user.compactDatafile()) // because update create a new line
        .catch(err => res.status(500).json(err))
});


app.post('/register', async (req, res) => {
    if(!req.body || !(req.body.username && req.body.password)) return res.status(400).json("Wrong data format");
    
    const [username, password] = [req.body.username, req.body.password];
    const user = await db.user.findOne({username: username});
    if(user) return res.status(400).json("Username already taken");

    return db.user.insert({username: username, password: password})
        .then(insert => res.status(200).json(insert))
        .catch(err => res.status(500).json(err));

});


app.get('/test', async (req, res) => {
    const signature = JSON.parse(req.get('signature')) || null;

    isValidSignature(signature)
        .then(isValid => {
            if(isValid === true) return res.status(200).json("Vous pouvez accéder au serveur");
            return res.status(400).json({err: isValid});
        })
        .catch(err => res.status(500).json(err));
});

// Start app
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
});