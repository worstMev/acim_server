
/*
 * need : num_decharge
 * - tech_main that did it 
 * - materiels : array of materiels and config
 * - date debut 
 * - date fin
 */
const dechargeTemplate = (decharge) => {
    let {
        num_decharge,
        date_debut,
        date_fin,
        tech_main_username,//from the intervention
        materiels,
    } = decharge;
    tech_main_username = (tech_main_username) ? tech_main_username : '';
    let tab_elements = materiels.map( (mat,index) => `
        <div class="info-tab">
            <div class="info-materiel"> Materiel #${ index+1 } :
                <ul>
                <li> Type : ${mat.libelle_materiel_type} </li>
                <li> Libellé : ${mat.libelle_materiel} </li>
                <li> id : ${mat.num_materiel} </li>
                </ul>
            </div>
            <p> avec configuration : ${(mat.config_origine) ? mat.config_origine : 'nd' } </p>
        </div>
        `).join(' ');
    console.log(tab_elements);
    let tab_element = `
        <div class="info-tab">
            <div class="info-materiel"> materiel :
                <ul>
                <li> type </li>
                <li> libelle </li>
                <li> num </li>
                </ul>
            </div>
            <p> avec config </p>
        </div>
    `;
    return (`
        <html>
            <head>
              <title>decharge</title>
              <style>
              </style>
            </head>
            <body>
                <div class="myDiv">
                    <div class="header">
                        <p> MNDPT </p>
                        <p> DSI </p>
                    </div>
                    <h1> Décharge de matériels pour maintenance </h1>
                    <p> Decharge ID : ${num_decharge}</p>
                    <div class="info myDiv">
                        <p> Du : ${date_debut} </p>
                        <p> Au : ${date_fin} </p>
                        <p> Faite par : ${tech_main_username} </p>
                        <p> Pour le${(materiels.length > 1) ? 's' : ''} matériel${(materiels.length > 1) ? 's' : ''}: </p>
                        ${tab_elements}
                    </div>
                     Signature :
                    <div class="signature ">
                        <div class="tech">
                            <p> Propriétaire </p>
                            <p> Pseudonyme dans acim : </p>
                        </div>
                        <div class="tech">
                            <p> Technicien </p>
                            <p> Pseudonyme dans acim : ${tech_main_username} </p>
                        </div>
                    </div>
                    <p> Imprimer le ${new Date().toLocaleString()}. </p>
                </div>
            </body>
        </html>
    `);
}

module.exports = {
    dechargeTemplate,
}
