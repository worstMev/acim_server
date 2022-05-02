const  cryptojs = require ('crypto-js');

const User = {
    TECH_MAIN : { 
        text :'technicien de maintenance',
        code : 'TECH_MAIN',
    },
    USER : {
        text : 'utilisateur',
        code : 'USER',
    },
    ADMIN : {
        text : 'admin',
        code : 'ADMIN',
    },
    DASH : { 
        text : 'tableau de bord',
        code : 'DASH',
    },
}

async function getTypeUser ( hashTypeUser , key ) {
    const computedHash_USER       = await computeHmac(User.USER.code, key);
    const computedHash_TECH_MAIN  = await computeHmac(User.TECH_MAIN.code, key);
    const computedHash_ADMIN      = await computeHmac(User.ADMIN.code, key);
    //const computedHash_DASH  = await computeHmac(User.DASH.code, key);
    if ( computedHash_USER === hashTypeUser ) return User.USER ;
    if ( computedHash_TECH_MAIN === hashTypeUser ) return User.TECH_MAIN ;
    if ( computedHash_ADMIN === hashTypeUser ) return User.ADMIN ;
    //if ( computedHash_DASH === hashTypeUser ) return User.DASH ;
}

async function computeHmac( text , key ) {
    let computedHash = await cryptojs.HmacMD5(text, key);
    const hexaComputedHash ='\\x'+computedHash;
    return hexaComputedHash;
}

module.exports = {
    getTypeUser,
    User,
}
