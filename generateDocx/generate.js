const docx = require('docx');
const { saveAs } = require('file-saver');

const { Document , 
        Packer , 
        Paragraph , 
        TextRun  , 
        SectionType ,
        HeadingLevel,
        AlignmentType ,
        TabStopType,
        TabStopPosition,
        Table,
        TableRow,
        TableCell,
        WidthType,
      } = docx;

async function generateDocx(decharge) {
    const {
        num_decharge,
        date_debut,
        date_fin,
        tech_main_username,
        num_intervention,
        materiels,
        renews,
    } = decharge;
    let materielsElement = [];
    let renewsElement = [];
    for(const [index,mat] of materiels.entries()){
        let el = new Paragraph({
            bullet : {
                level : 0,
            },
            children : [
                new TextRun({
                    text : `Matériel #${index+1}`,
                }),
                new TextRun({
                    break : 1,
                    text : `Type : ${mat.libelle_materiel_type}`,
                }),
                new TextRun({
                    break : 1,
                    text : `Libellé : ${mat.libelle_materiel}`,
                }),
                new TextRun({
                    break : 1,
                    text : `id : ${mat.num_materiel}`,
                }),
            ],
        });
        materielsElement.push(el);
    }
    for( const renew of renews ) {
        let { 
            date_creation_renouvellement , 
            ancienne_date,
            new_date,
            username,
        } = renew;
        const date_renew = new Date(date_creation_renouvellement).toLocaleString();
        const old = new Date(ancienne_date).toLocaleDateString();
        const newd = new Date(new_date).toLocaleDateString();
        let el = new TextRun({
            break : 1,
            text : `Renouvellée le ${date_renew} du ${old} au ${newd} par ${username}. `,
        });
        renewsElement.push(el);
        
    }
    const doc = new Document ({
        sections : [
            {
                properties : {},
                children : [
                    new Paragraph({
                        children : [
                             new TextRun('MNDPT'),
                             new TextRun({
                                 break  : 1,
                                 text   :'DSI',
                             }),
                        ],
                        alignment : AlignmentType.CENTER,
                    }),
                    new Paragraph({
                        children : [
                            new TextRun('Décharge de matériel pour maintenance'),
                        ],
                        spacing : {
                            before : 200,
                            after : 200,
                        },
                        heading : HeadingLevel.HEADING_1
                    }),
                    new Paragraph({
                        children : [
                            new TextRun({
                                text : `Intervention ID : ${num_intervention}`,
                            }),
                            new TextRun({
                                break : 1,
                                text : `Décharge ID : ${num_decharge}`,
                            }),
                            new TextRun({
                                break : 1,
                                text : `Du ${date_debut} au ${date_fin}`,
                            }),
                            new TextRun({
                                break : 1,
                                text : `Faite par : ${tech_main_username}`,
                            }),
                            new TextRun({
                                break : 3,
                                text : `Pour ${ (materiels.length > 1) ? 'les matériels' : 'le matériel'} :`,
                            }),
                        ],
                    }),
                ],
            },
            {
                properties : {
                    type : SectionType.CONTINUOUS,
                },
                children : materielsElement,
            },
            {
                properties : {
                    type : SectionType.CONTINUOUS,
                },
                children : [
                    new Paragraph({
                        children : renewsElement,
                    }),
                ],
            },
            {
                properties : {
                    type : SectionType.CONTINUOUS,
                },
                children : [
                    new Paragraph({
                        children : [
                            new TextRun({
                                text : 'Signature',
                            }),
                            new TextRun({
                                break : 10,
                                text : 'Propriétaire',
                            }),
                            new TextRun('\tTechnicien'),
                        ],
                        tabStops : [
                            {
                                type: TabStopType.RIGHT,
                                position : TabStopPosition.MAX
                            }
                        ],
                    }),
                    new Paragraph({
                        children : [
                            new TextRun({
                                text : `Généré le ${new Date().toLocaleString('fr-FR')}`,
                            }),
                        ],
                    }),
                ],
            }

        ],
    });

    const b64string = await Packer.toBase64String(doc);
    return b64string;

}


async function generateRapportDocx(intervs, debut ,fin,myself) {
    let intervTableRows = [];
    let username = myself.username;
    debut = new Date(debut).toLocaleDateString('fr-FR');
    fin = new Date(fin).toLocaleDateString('fr-FR');
    let textRapport = `Rapport d'activité de (${username})  du ${debut} au ${fin}`;
    if ( debut === fin ) textRapport = `Rapport d'activité de (${username})  du ${debut}`;
    
    for ( const [index,interv] of intervs.entries() ) {
        let date_debut  = new Date(interv.date_debut);
        let date        = date_debut.toLocaleDateString('fr-FR');
        let debut       = date_debut.toLocaleTimeString('fr-FR',{ hour : '2-digit' , minute : '2-digit' });
        let date_fin ;
        let fin = 'en cours';
        if(interv.date_fin){
            date_fin    = new Date(interv.date_fin);
            fin         = date_fin.toLocaleString('fr-FR');
            if( date_fin.toLocaleDateString('fr-FR') === date ) {
                fin     = new Date(interv.date_fin).toLocaleTimeString('fr-FR',{ hour : '2-digit' , minute : '2-digit' });
            }
        }
        let motif = interv.motif || 'nd';
        let libelle_probleme_tech_type = interv.libelle_probleme_tech_type || 'nd';
        let commentaire = interv.commentaire || '';
        let description = `${interv.libelle_intervention_type}-${commentaire}`;
        if ( interv.num_app_user_tech_main_creator !== myself.num_user ){
            description = `Participe à une intervention de ${interv.tech_main_username} : ${interv.libelle_intervention_type}-${commentaire} `
        }
        let newTableRow = new TableRow({
            cantSplit : true,
            children: [
                new TableCell({
                    width : {
                        size : '4%',
                        type : WidthType.PERCENTAGE,
                    },
                    children: [new Paragraph(`${index+1}`)],
                }),
                new TableCell({
                    width : {
                        size : '12%',
                        type : WidthType.PERCENTAGE,
                    },
                    children: [new Paragraph(date)],
                }),
                new TableCell({
                    width : {
                        size : '12%',
                        type : WidthType.PERCENTAGE,
                    },
                    children: [new Paragraph(debut)],
                }),
                new TableCell({
                    width : {
                        size : '12%',
                        type : WidthType.PERCENTAGE,
                    },
                    children: [new Paragraph(fin)],
                }),
                new TableCell({
                    width : {
                        size : '12%',
                        type : WidthType.PERCENTAGE,
                    },
                    children: [new Paragraph(interv.libelle_lieu)],
                }),
                new TableCell({
                    width : {
                        size : '12%',
                        type : WidthType.PERCENTAGE,
                    },
                    children: [new Paragraph(description)],
                }),
                new TableCell({
                    width : {
                        size : '12%',
                        type : WidthType.PERCENTAGE,
                    },
                    children: [new Paragraph(motif)],
                }),
                new TableCell({
                    children: [new Paragraph(libelle_probleme_tech_type)],
                    width : {
                        size : '12%',
                        type : WidthType.PERCENTAGE,
                    },
                }),
                new TableCell({
                    width : {
                        size : '12%',
                        type : WidthType.PERCENTAGE,
                    },
                    children: [new Paragraph(interv.num_intervention.substring(0,8))],
                }),
            ],
        });
        intervTableRows.push(newTableRow);
    }
    const doc = new Document ({
        sections : [
            {
                properties : {},
                children : [
                    new Paragraph({
                        children : [
                             new TextRun('MNDPT'),
                             new TextRun({
                                 break  : 1,
                                 text   :'DSI',
                             }),
                        ],
                        alignment : AlignmentType.CENTER,
                    }),
                    new Paragraph({
                        children : [
                            new TextRun(textRapport),
                        ],
                        spacing : {
                            before : 200,
                            after : 200,
                        },
                        heading : HeadingLevel.HEADING_1
                    }),
                    new Paragraph({
                        children : [
                            new TextRun({
                                text : `Nom : `,
                            }),
                            new TextRun({
                                break : 1,
                                text : `Prénom :`,
                            }),
                            new TextRun({
                                break : 1,
                                text : `Pseudo dans a.c.i.m.i : ${username}`,
                            }),
                        ],
                    }),
                    new Paragraph({
                        children : [
                            new TextRun(`Nombre d'intervention : ${intervs.length}`),
                        ],
                        spacing : {
                            before : 200,
                        }
                    }),
                    new Table({
                        width : {
                            size : '100%',
                            type : WidthType.PERCENTAGE,
                        },
                        //this is what changes width for now 
                        columnWidths : [ 3 , 15, 12, 12, 9, 13, 12, 12, 12],
                        rows: [
                            new TableRow({
                                tableHeader : true,
                                children: [
                                    new TableCell({
                                        width : {
                                            size : '4%',
                                            type : WidthType.DXA,
                                        },
                                        children: [new Paragraph("#")],
                                    }),
                                    new TableCell({
                                        width : {
                                            size : '12%',
                                            type : WidthType.PERCENTAGE,
                                        },
                                        children: [new Paragraph("Date")],
                                    }),
                                    new TableCell({
                                        width : {
                                            size : '12%',
                                            type : WidthType.PERCENTAGE,
                                        },
                                        children: [new Paragraph("Debut")],
                                    }),
                                    new TableCell({
                                        width : {
                                            size : '12%',
                                            type : WidthType.PERCENTAGE,
                                        },
                                        children: [new Paragraph("Fin")],
                                    }),
                                    new TableCell({
                                        width : {
                                            size : '12%',
                                            type : WidthType.PERCENTAGE,
                                        },
                                        children: [new Paragraph("Lieu")],
                                    }),
                                    new TableCell({
                                        width : {
                                            size : '12%',
                                            type : WidthType.PERCENTAGE,
                                        },
                                        children: [new Paragraph("Description")],
                                    }),
                                    new TableCell({
                                        width : {
                                            size : '12%',
                                            type : WidthType.PERCENTAGE,
                                        },
                                        children: [new Paragraph("Motif")],
                                    }),
                                    new TableCell({
                                        width : {
                                            size : '12%',
                                            type : WidthType.PERCENTAGE,
                                        },
                                        children: [new Paragraph("Probleme constaté")],
                                    }),
                                    new TableCell({
                                        width : {
                                            size : '12%',
                                            type : WidthType.PERCENTAGE,
                                        },
                                        children: [new Paragraph("Pseudo ID")],
                                    }),
                                ],
                            }),
                            ...intervTableRows,
                        ],
                    }),
                ],
            },
            {
                properties : {
                    type : SectionType.CONTINUOUS,
                },
                children : [
                    new Paragraph({
                        children : [
                            new TextRun({
                                text : `Generé le ${new Date().toLocaleString('fr-FR')}`,
                            }),
                        ],
                    }),
                ],
            }

        ],
    });

    const b64string = await Packer.toBase64String(doc);
    return b64string;

}

module.exports = {
    generateDocx,
    generateRapportDocx,
}
