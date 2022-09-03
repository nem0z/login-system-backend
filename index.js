import express from 'express';
import Datastore from 'nedb-promises';
import crypto from 'crypto';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

const db = {
    'user': Datastore.create('./dbs/user.db'),
    'token': Datastore.create('./dbs/token.db')
};


app.post('/login', async (req, res) => {
    console.log('data : ',req.body);
    if(!req.body || !(req.body.username && req.body.password)) return res.status(400).json("Wrong data format");
    
    const [username, password] = [req.body.username, req.body.password];
    const user = await db.user.findOne({username: username});

    if(!user) return res.status(400).json("No user find with given login");
    if(user.password !== password) return res.status(400).json("Wrong password for given user");

    const input = `${username}-${password}-${Date.now()}`;
    const token = crypto.createHash('sha256').update(input).digest('base64');

    return db.token.insert({token: token, expire_at: Date.now() + 1000 * 60 * 60})
        .then(doc => res.status(200).json(doc.token))
        .catch(err => res.status(500).json(err))
});


app.post('/register', async (req, res) => {
    if(!req.body || !(req.body.username && req.body.password)) return res.status(400).json("Wrong data format");
    
    const [username, password] = [req.body.username, req.body.password];
    const user = await db.user.findOne({username: username});
    if(user) return res.status(400).json("Username already taken");

    return db.user.insert({username: username, password: password})
        .then(doc => res.status(200).json(doc))
        .catch(err => res.status(500).json(err));

});


app.get('/test', async (req, res) => {
    const token = req.get('token');
    return db.token.findOne({token: token})
        .then(doc => {
            if(doc && doc.expire_at >= Date.now()) return res.status(200).json("Vous pouvez acceder au server");
            if(doc) return res.status(400).json("Token expired");
            return res.status(400).json("Token doesn't exist");
        })
        .catch(err => res.json(500).send(err));
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
});