import { promises as fs} from 'fs';
import Datastore from 'nedb-promises';
import users from './dbs/users.json' assert {type: 'json'};

const db = Datastore.create('./dbs/user.db');

fs.writeFile('./dbs/user.db', '').then(res => {
    return db.insert(users)
        .then(doc => console.log(doc));
});
