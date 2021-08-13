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

async function getAllDataInTable (table) {
    console.log('get all data in table '+table);
    const query_text = `SELECT * FROM ${table} ;`;
    try{
        const { rows } = await pool.query(query_text);
        console.log('all data in table' , rows );
        if(rows){
            return rows;
        }
    }catch(err){
        console.log('problem in getAllDataInTable ' , err);
    }
}



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
        console.log('error in checkInDatabase',err);
    }
    return{
        found : isInTable,
        row   : data
    };
}

async function checkCredentials(username , pwd){
    console.log('in checkCredentials');

    const query_text = 'SELECT * FROM app_user WHERE username = $1 AND password = crypt($2,password)';

    let data ;

    try{
        const { rows } = await pool.query(query_text,[username , pwd]);
        data = rows[0];
        console.log(data);
        
        if(rows[0]) {
            return {
                found : true,
                row : { 
                    num_user : data.num_user,
                    username : data.username, 
                    type_user : data.type_user,
                },
            }
        }

    }catch(err){
        console.log('error in checkCredentials', err);
    }
}

async function getAggregate(table , aggr){
    const query = `SELECT ${aggr} from ${table};`
    try{
        const { rows } = await pool.query(query);
        if ( rows ) return rows[0];
    }catch(err){
        console.log('error in getAggregate', err);
    }
}

async function getListProblem() {
    console.log('getListProblem ()');
    const query_text = 'SELECT * from probleme_type ; ';

    try{
        const { rows } = await pool.query(query_text);
        //console.log('getListProblem () --'+rows);
        return rows;
    }catch(err){
        console.log('problem in getListProblem ', err);
    }
}
async function getListProblemeStatut() {
    console.log('getListProblemStatut ()');
    const query_text = 'SELECT * from probleme_statut ; ';

    try{
        const { rows } = await pool.query(query_text);
        //console.log('getListProblemStatut () --'+rows);
        return rows;
    }catch(err){
        console.log('problem in getListProblemStatut ', err);
    }
}

async function getListLieu() {
    console.log('getListLieu ()');
    const query_text = 'SELECT * from lieu ; ';

    try{
        const { rows } = await pool.query(query_text);
        //console.log('getListLieu () --'+rows);
        return rows;
    }catch(err){
        console.log('problem in getListLieu ', err);
    }
}

async function createNotif({num_app_user_user,newProblem}) {
    //create the problem first
    let { num_probleme_type , num_lieu , num_probleme_statut , remarque} = newProblem;
    const query_text_problem = 'INSERT INTO probleme (num_probleme_type, num_lieu, num_probleme_statut , remarque) VALUES ( $1, $2, $3 , $4) RETURNING *;';
    const query_text_notif = 'INSERT INTO notification (num_app_user_user ,num_probleme ) VALUES ( $1 , $2 ) RETURNING *;';
    try{
        const insertedProblem = await pool.query(query_text_problem, [num_probleme_type, num_lieu, num_probleme_statut, remarque ]);
        console.log('inserted problem' , insertedProblem.rows[0] );
        if( insertedProblem.rows[0].num_probleme ) {
            const insertedNotif = await pool.query(query_text_notif , [num_app_user_user,insertedProblem.rows[0].num_probleme ]);
            console.log('inserted notif ' , insertedNotif.rows[0]);

            if( insertedNotif.rows[0].num_notification ){
                //emit aknowledge
                return {
                    num_notification : insertedNotif.rows[0].num_notification,
                    num_app_user_user : insertedNotif.rows[0].num_app_user_user,
                    date_envoie : insertedNotif.rows[0].date_envoie,
                }

            }

        }
    }catch(err){
        console.log('error in createNotif', err);
    }
}

async function getNotification(arrayProp,arrayVal){
    let prop_text = arrayProp.map( (item,index) => `${item} = $${index +1}`).join(' AND ');

    console.log('getNotification' , prop_text);
    console.log('getNotification' , arrayVal);    

    const query_text = `SELECT * from view_notification_user_probleme_full
       WHERE ${prop_text} ;
    `;
    try{
        const result = await pool.query(query_text,arrayVal);
        //console.log(result.rows);
        return  result.rows; 
        
    }catch(err){
        console.log('problem on getNotification' , err);
    }
}

async function getHistoryNotificationForUser(num_user){
    const query = `SELECT * FROM view_notification_by_user 
    ${(num_user) ? 'WHERE num_app_user_user = $1' : ''} 
    ORDER BY date_envoie DESC`;
    const value = (num_user) ? [ num_user ] : [];
    try{
        const result = await pool.query(query, value);
        //console.log('history ',result.rows);
        if( result.rows ){
            return result.rows;
        }
    }catch(err){
        console.log('problem in getHistoryNotificationForUser' , err);
    }
}

async function getListNotificationUnanswered(){
    const query = `SELECT * FROM view_notification_by_user 
                    WHERE num_app_user_tech_main IS NULL 
                    ORDER BY date_envoie DESC`;
    try{
        const result = await pool.query(query);
        //console.log('notifs unanswered ',result.rows);
        if( result.rows ){
            return result.rows;
        }
    }catch(err){
        console.log('problem in getListNotificationUnanswered' , err);
    }
}

async function updateNotification (setArrayProp,setValue,arrayProp, arrayVal){
    let set_prop_text = setArrayProp.map((item,index) => `${item} = $${index +1}`).join(' , ');
    let prop_text = arrayProp.map( (item,index) => `${item} = $${index +setArrayProp.length +1}`).join(' AND ');

    let arrayAllVal = setValue.concat(arrayVal);
    console.log('updateNotification' , set_prop_text , prop_text);
    console.log('updateNotification' , arrayAllVal);    
    
    const query_text = `UPDATE notification
                            SET ${set_prop_text} 
                            WHERE ${prop_text}
                        RETURNING *;`
    console.log(query_text);
    try{
        const resUpdate = await pool.query(query_text,arrayAllVal);
        let updatedNotif = resUpdate.rows[0];
        console.log('updateNotif ',updatedNotif);
        const info_query_text = `SELECT * from view_notification_by_user WHERE num_notification = $1;`;
        const resInfo = await pool.query(info_query_text,[ updatedNotif.num_notification]);
        console.log(resInfo.rows[0]);
        return resInfo.rows[0];
    }catch(err){
        console.log('problem in updateNotification ' , err);
    }

}

async function createIntervention ( num_app_user_tech_main_creator ,num_intervention_type, code_intervention_type , num_lieu_intervention , motif , date_programme , num_materiel, num_probleme_tech_type ){
    let query_num_intervention_type;
    let prop_intervention_type ;
    if ( !num_intervention_type ){
        if(code_intervention_type){
            query_num_intervention_type = `( select num_intervention_type from intervention_type where code_intervention_type = $2)`;
            prop_intervention_type = code_intervention_type;
        }
    }else{
        query_num_intervention_type = '$2';
        prop_intervention_type = num_intervention_type;
    }
    
    const query_text = ` INSERT into intervention(num_app_user_tech_main_creator , num_intervention_type , num_lieu_intervention , motif , date_programme ) values ($1 , 
        ${query_num_intervention_type} , $3 , $4 , $5) RETURNING *;`
    const values = [num_app_user_tech_main_creator ,
                    prop_intervention_type,
                    num_lieu_intervention ,
                    motif ,
                    date_programme ];
    try{
        const { rows } = await pool.query(query_text,values);
        console.log('created an intervention' , rows[0]);
        if ( rows[0] ) return rows[0];
    }catch(err){
        console.log('error in create intervention', err);
    }
}

async function insertIntoTable ( table , arrayProp , valueProp ) {
    const query_prop = arrayProp.join(',');
    console.log(query_prop);
    const query_value = arrayProp.map(( item, index) => `$${index+1}`).join(',');
    console.log(query_value);
    const query = `INSERT INTO ${table} ( ${query_prop} ) VALUES ( ${query_value} ) RETURNING * ;`
    console.log(query);
    try{
        const { rows } = await pool.query(query,valueProp);
        console.log('inserted  in table '+table+':', rows[0] );
        if( rows ) return rows[0];
    }catch(err){
        console.log('error in insert table :'+table+ '--', err);
    }
}

async function createInterventionCustom (arrayProp, valueProp){
    try{
        const newIntervention = await insertIntoTable('intervention', arrayProp , valueProp);
        if ( newIntervention ) return newIntervention;
    }catch(err){
        console.log('error in createInterventionCustom ',err);
    }
}

async function createProblemeTech ( arrayProp , valueProp){

    try{
        const newProblemeTech = await insertIntoTable('probleme_tech', arrayProp , valueProp);
        if ( newProblemeTech ) return newProblemeTech;
    }catch(err){
        console.log('error in createProblemeTech ',err);
    }
}

async function createDecharge ( arrayProp , valueProp){
    try{
        const newDecharge = await insertIntoTable('decharge', arrayProp , valueProp);
        if ( newDecharge ) return newDecharge;
    }catch(err){
        console.log('error in createDecharge', err);
    }
}

async function createDechargeMateriel ( arrayProp , valueProp){
    try{
        const newDechargeMateriel = await insertIntoTable('decharge_materiel', arrayProp , valueProp);
        if ( newDechargeMateriel ) return newDechargeMateriel;
    }catch(err){
        console.log('error in createDechargeMateriel', err);
    }
}

async function getDechargeInfo( num_decharge ){
    const query = 'SELECT * from view_decharge_full where num_decharge = $1';
    try{
        const { rows } = await pool.query(query,[num_decharge]);
        console.log(rows);
        if (rows) return rows;
    }catch(err){
        console.log('error in getDechargeInfo', err);
    }
}

async function getListInterventionUndone(num_tech_main = null) {
    let whereClause;
    let arrayValue;
    if(num_tech_main){
        whereClause = ` num_app_user_tech_main_creator = $1 `;
        arrayValue = [ num_tech_main ];
    }else{
        whereClause = ' num_app_user_tech_main_creator IS NOT NUll ';
    }
    

    const query_text = `SELECT * from view_intervention_undone 
    WHERE ${whereClause}
    ORDER BY date_programme ASC`
    try{
        const { rows } = await pool.query(query_text , arrayValue);
        if( rows ) return rows;
    }catch(err){
        console.log('error in getListInterventionUndone' , err);
    }
}

async function getDataInTable(table , arrayProp , arrayValue){
    const whereClause = arrayProp.map( (prop,index) => `${prop} = $${index+1}`).join(' AND ');
    const query_text = `SELECT * from ${table}
    WHERE ${whereClause}`;
    try{
        const {rows} = await pool.query(query_text , arrayValue); 
        if(rows) return rows;
        else return new Error('no data in getDataInTable');
    }catch(err){
        console.log('error in getDataInTable',table, err);
    }
}

async function getListIntervention(num_tech_main , debut , fin , done , probleme_resolu){
        
    let whereClauseArray = [
        'num_app_user_tech_main_creator = ',
        'date_programme >= ',
        'date_programme <= ',
        'done = ',
        'probleme_resolu =',
    ];
    let arrayValue = [ num_tech_main , debut, fin , done ,probleme_resolu ];
    let indexToSuppr = [];
    for( const [index,val] of arrayValue.entries()){
        console.log(index,val);
        if(val  === 'nd') indexToSuppr.push(index);
    }
    console.log('indexToSuppr', indexToSuppr);
    for( const [index,i] of indexToSuppr.entries() ){
        let iSuppr = i - index;//everytime we splice the size of the array goes down
        arrayValue.splice(iSuppr,1);
        whereClauseArray.splice(iSuppr,1);
    }
    console.log('whereClause' ,whereClauseArray);
    console.log('arrayValue', arrayValue);
    let whereClause = whereClauseArray.map( (item,index) => ` ${item} $${index+1} `).join(' AND ');
    console.log('whereClause' , whereClause);
    let query_text = `SELECT * from view_intervention_full
    WHERE ${whereClause}
    ORDER BY date_programme ASC`;

    console.log(query_text);
    console.log(arrayValue);
      
    try{
        const {rows} = await pool.query(query_text,arrayValue); 
        if(rows) return rows;
    }catch(err){
        console.log('error in getListIntervention',err);
    }
    
}

async function getNbInterventionUndone () {
    const query_text = `SELECT count(*) as nb_intervention_undone from view_intervention_undone ;`;

    try{
        const { rows } = await pool.query(query_text);
        console.log('nbTacheUndone' , rows[0]);
        return rows[0].nb_intervention_undone ;
        
    }catch(err){
        console.log('problem in getNbInterventionUndone' , err);
    }
}

async function getListOfInterventionFromNotif(num_user) {
    
    const query = `SELECT * FROM view_notification_by_user_intervention 
    ${(num_user) ? 'WHERE num_app_user_user = $1' : ''} 
    ORDER BY date_programme DESC`;
    const value = (num_user) ? [ num_user ] : [];
    try{
        const result = await pool.query(query, value);
        //console.log('history ',result.rows);
        if( result.rows ){
            return result.rows;
        }
    }catch(err){
        console.log('problem in getListOfInterventionFromNotif' , err);
    }
}

async function updateTable(table,setPropArray,setValueArray,wherePropArray,whereValueArray){
    let setClause = setPropArray.map( (setProp,index) => `${setProp} = $${index+1}`).join(' , ');
    let whereClause = wherePropArray.map( (whereProp,index) => `${whereProp} = $${index + setPropArray.length + 1}` ).join(' AND ');

    let valueArray = setValueArray.concat(whereValueArray);
    const query_text = ` UPDATE ${table}
    SET ${setClause}
    WHERE ${whereClause}
    RETURNING *;
    `;
    try{
        const { rows } = await pool.query(query_text,valueArray);
        if (rows) return rows;
    }catch(err){
        console.log('error in updateTable:',table , err);
    }
}

async function updateInterventionFull (setPropArray,setValueArray,wherePropArray,whereValueArray){
    console.log('updateIntervention',setPropArray,setValueArray,wherePropArray,whereValueArray);
    try{
        const updatedInterventions = await updateTable('intervention' ,setPropArray,setValueArray,wherePropArray,whereValueArray);
        if (updatedIntervention) return updatedIntervention;
    }catch(err){
        console.log('error in updateIntervention',err);
    }

}

async function updateIntervention (setPropArray,setValueArray,wherePropArray, whereValueArray){
    try{
        const updatedInterventions = await updateTable('intervention' ,setPropArray,setValueArray,wherePropArray,whereValueArray);
        console.log('updateInterventions' ,updatedInterventions);
        let num_intervention = updatedInterventions[0].num_intervention;
        console.log('num_intervention', num_intervention);
        if (updatedInterventions){
            const updatedIntervention = await checkInDatabase('view_intervention_full',['num_intervention'],[num_intervention]) ;
            console.log('updatedIntervention 1', updatedIntervention.row);
            return updatedIntervention.row;

        }
    }catch(err){
        console.log('error in updateIntervention', err);
    }
}

async function updateDecharge(setPropArray,setValueArray,wherePropArray, whereValueArray){
    try{
        const updatedDecharge = await updateTable('decharge',setPropArray,setValueArray,wherePropArray, whereValueArray);
        if (updatedDecharge) return updatedDecharge;
    }catch(err){
        console.log('error in updateDecharge', err);
    }
}

module.exports = {
    checkInDatabase,
    checkCredentials,
    getAggregate,
    getListProblem ,
    getListLieu,
    getListProblemeStatut,
    getNotification,
    getHistoryNotificationForUser,
    getListNotificationUnanswered,
    getListInterventionUndone,
    getListIntervention,
    getAllDataInTable,
    getNbInterventionUndone,
    getListOfInterventionFromNotif,
    getDechargeInfo,
    updateNotification,
    updateIntervention,
    updateInterventionFull,
    updateDecharge,
    createNotif,
    createIntervention,
    createInterventionCustom,
    createProblemeTech,
    createDecharge,
    createDechargeMateriel,
}
