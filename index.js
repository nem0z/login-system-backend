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
    'token': Datastore.create('./dbs/token.db')
};



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
        .then(numReplaced => res.status(200).json(numReplaced))
        .then(db.user.compactDatafile()) // because update create a new line
        .catch(err => res.status(500).json(err))
});


app.post('/register', async (req, res) => {
    if(!req.body || !(req.body.username && req.body.password)) return res.status(400).json("Wrong data format");
    
    const [username, password] = [req.body.username, req.body.password];
    const user = await db.user.findOne({username: username});
    if(user) return res.status(400).json("Username already taken");

    return db.user.insert({username: username, password: password})
        .then(insert => res.status(200).json(doc))
        .catch(err => res.status(500).json(err));

});


app.get('/test', async (req, res) => {
    const token = req.get('token');
    return db.token.findOne({"credential.token": token})
        .then(doc => {
            if(doc && doc.expire_at >= Date.now()) return res.status(200).json("Vous pouvez acceder au server");
            if(doc) return res.status(400).json("Token expired");
            return res.status(400).json("Token doesn't exist");
        })
        .catch(err => res.json(500).send(err));
});

// Start app
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
});