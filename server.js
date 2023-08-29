const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const bodyParser = require('body-parser');

const image = require('./controllers/image');

const db = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL
    // {
    //   host : 'ccc.oregon-postgres.render.com',
    //   port : 5432,
    //   user : 'test_7nva_user',
    //   password : 'yWH4MoVTYNAy3DjbjAIQiGLfHkQ2P1TV',
    //   database : 'test_7nva'
    // }
  });



const app = express();
app.use(cors());
app.use(express.json());
// app.use(bodyParser.json());




// app.get('/',(req,res)=> {
//     res.send('success');
// })

app.post('/signin',(req,res) => {
    db.select('email','hash').from('login')
      .where('email','=',req.body.email)
      .then(data => {
        const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
        if(isValid){
            return db.select('*').from('users')
              .where('email', '=' , req.body.email)
              .then(user => {
                // console.log(user)
                res.json(user[0])
              })
              .catch(err => res.status(400).json('unable to get user'))
        }
        else{
            res.status(400).json('wrong credentials')
        }
      })
      .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register', (req,res) => {
    const { email , name , password} = req.body;
    if(!email || !name || !password){
        return res.status(400).json('incorrect form submission');
    }
    const hash = bcrypt.hashSync(password);
        db.transaction(trx => {
            trx.insert({
                hash: hash,
                email: email
            })
            .into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                    .returning('*')
                    .insert({
                        email: loginEmail[0].email,
                        name: name,
                        joined: new Date()
                    })
                    .then(user => {
                        res.json(user[0]);
                    })
            })
            .then(trx.commit)
            .catch(trx.rollback)
        })
        
        .catch(err => res.status(400).json('unable to register'))
})

app.get('/profile/:id', (req,res) => {
    const { id } = req.params;
    db.select('*').from('users').where({id})
    .then(user => {
        if(user.length){
            res.json(user[0])
        }else{
            res.status(400).json('not found')
        }
    })
    .catch(err => res.status(400).json('error getting user'))
    // if(!found){
    //     res.status(404).json('user not found');
    // }
})

app.put('/image',(req,res) => {image.handleImage(req,res,db)})

app.listen(process.env.port || 3000, () => {
    console.log(`app is running on port 3000 ${process.env.port}`)
})