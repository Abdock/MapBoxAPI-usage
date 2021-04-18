let config = {
    apiKey: "hXBt2sTMhpV6Zq3OVZo4Il9zSlau2ByMHh5YDZCf",
    authDomain: "smartbin-4d89e-default-rtdb.firebaseapp.com",
    projectId: "smartbin-4d89e-default-rtdb",
    databaseURL: "https://smartbin-4d89e-default-rtdb.firebaseio.com",
};
firebase.initializeApp(config);
const database = firebase.database(), doc = document;
let list = [];

function getUsers(data)
{
    list = data.val();
}

doc.getElementById('submit').addEventListener('click', function(ev)
{
    const login = doc.getElementById('username').value, pass = doc.getElementById('password').value;
    for(let i = 0; i < list.length; ++i)
    {
        if(list[i].login == login && list[i].password == pass)
        {
            localStorage['user-type'] = 'driver';
            localStorage['driver-index'] = i;
            doc.location.href = '../map/index.html';
        }
        else if(login == 'esentaik' && pass == 'password123')
        {
            localStorage['user-type'] = 'nodriver';    
            doc.location.href = '../map/index.html';
        }
    }
    doc.getElementById('username').value = '';
    doc.getElementById('password').value = '';
    doc.getElementById('username').style.borderColor = 'red';
    doc.getElementById('password').style.borderColor = 'red';
});

(function(){
    database.ref('drivers').on('value', getUsers);
})()