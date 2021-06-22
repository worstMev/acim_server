//all functions related to database manipulation

const { Pool }      = require('pg');

const local_config  = {
    host        : 'localhost',
    port        : '5432',
    database    : 'acim',
    user        : 'acim',
    password    : 'acim',
}

const pool = new Pool(local_config);


async function checkInDatabase(table , prop_array , value_array ){
    console.log('in checkDatabase');
    let condition = [];
    for( const [index, prop] of prop_array.entries()){
        condition.push(`${prop} = $${index+1}`);
    }
    const query_text = `SELECT * FROM ${table} WHERE ${condition.join(' AND ')};`;

    let isInTable = false;
    let data ;

    try{
        const { rows } = await pool.query(query_text,value_array);
        data = rows[0];
       
        if(rows[0])  isInTable = true;
    }catch(err){
        console.log(err);
    }
    return{
        found : isInTable,
        row   : data
    };
}

async function checkCredentials(username , pwd){
    console.log('in checkCredentials');

    const query_text = 'SELECT * FROM app_user WHERE username = $1 AND password = crypt($2,password)';

    let isAuthenticated = false;
    let data ;

    try{
        const { rows } = await pool.query(query_text,[username , pwd]);
        data = rows[0];
        
        if(rows[0]) isAuthenticated = true;

    }catch(err){
        console.log(err);
    }
    return {
        found : isAuthenticated,
        row : { 
            username : data.username, 
            type_user : data.type_user,
        },
    }
}

module.exports = {
    checkInDatabase,
    checkCredentials,
}
