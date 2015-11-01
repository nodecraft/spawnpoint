module.exports = function(app){
    // inside this function, we have a reference to the app variable. As it's updated here or in other files we will get those changes. This is NOT a copy of the variable but a reference which changes as the variable itself changes
    
    app.express.get('/home', function(req, res){
        return res.send('welcome home!');
    });
}