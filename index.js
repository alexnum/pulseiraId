var express = require('express');
var mongoose = require('mongoose');
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var jwt    = require('jsonwebtoken');
var app = express();
var swig  = require('swig');
var cookieParser = require('cookie-parser');


app.set('port', (process.env.PORT || 5000));
mongoose.connect('mongodb://heroku_5qcn5df4:l0imr1m3a4sse3dauep5qj131s@ds033096.mlab.com:33096/heroku_5qcn5df4');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(cookieParser());


var User = mongoose.model('User', 
	{ 
		name: String,
		bloodType: String,
		password: String
	}
);

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
	var template = swig.compileFile('views/pages/login.html');
	var output = template({});	
  	response.send(output);
});

app.get('/register', function(req, res) {
    var template = swig.compileFile('views/pages/register.html');
    var registerPage = template({}); 
    res.status(200).send(registerPage);
});

app.post('/register', function(req, res) {
    var newUser = new User({
      name: req.body.name,
      password: req.body.password,
      bloodType: req.body.bloodType ? req.body.bloodType : ""
    });
    newUser.save(function (err){
      if(err){
        res.redirect('/register?error')
      }else{
        res.redirect('/')
      }
    })
});


app.get('/setup', function(req, res) {
  var setup = new User({
  	name: "admin",
  	password: "123456",
  	bloodType: 'A+'
  });
  setup.save(function(err){
  	if(err){
  		res.status(500).send("treta");
  	}else{
  		res.status(201).send('Created');
  	}
  });
});


app.get('/new-user', function(req, res) {
  var newUser = new User({
  	name: "user" + new Date().getTime(),
  	bloodType: new Date().getTime() % 2 == 0 ? 'A+' : 'B+'
  });
  newUser.save(function(err){
  	if(err){
  		res.status(500).send("treta");
  	}else{
  		res.status(201).send('Created');
  	}
  });
});

app.get('/users', function(req, res){
	User.find({}).exec(function(err, users){
		if(err){
			res.status(500).send("treta");
		}else{
			res.send(users);
		}
	})
});

// API ROUTES -------------------

// get an instance of the router for api routes
var apiRoutes = express.Router(); 

// TODO: route to authenticate a user (POST http://localhost:8080/api/authenticate)

apiRoutes.post('/authenticate', function(req, res) {

  // find the user
  console.log(req.body.name);
  User.findOne({
    name: req.body.name
  }, function(err, user) {

    if (err) throw err;

    if (!user) {
      res.redirect(301, '/?loginError');
    } else if (user) {

      // check if password matches
      if (user.password != req.body.password) {
        res.redirect(301, '/?loginError');
      } else {

        // if user is found and password is right
        // create a token
        var token = jwt.sign(user, 'batata', {
          expiresIn : 60*60*24
        });
        res.cookie('x-access-token', token, { maxAge: 900000, httpOnly: true });
        //res.redirect('/api/profile?token='+token);
        res.redirect(301, '/api/profile');

        // // return the information including token as JSON
        // res.json({
        //   success: true,
        //   message: 'Enjoy your token!',
        //   token: token
        // });
      }
    }
  });
});

// TODO: route middleware to verify a token

apiRoutes.use(function(req, res, next) {

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'] || req.cookies['x-access-token'];

  // decode token
  if (token) {

    // verifies secret and checks exp
    jwt.verify(token, 'batata', function(err, decoded) {      
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded._doc;    
        next();
      }
    });

  } else {

    // if there is no token
    // return an error
    res.redirect('/');
    
  }
});

// route to show a random message (GET http://localhost:8080/api/)
apiRoutes.get('/profile', function(req, res) {
  	var template = swig.compileFile('views/pages/profile.html');
  	console.log("user: " + JSON.stringify(req.decoded, null, 2));
	  var output = template(req.decoded);	
  	res.status(200).send(output);
});



// route to return all users (GET http://localhost:8080/api/users)
apiRoutes.post('/logout', function(req, res) {
  res.clearCookie('x-access-token');
  res.redirect('/');
});

// route to return all users (GET http://localhost:8080/api/users)
apiRoutes.get('/usersx', function(req, res) {
  User.find({}, function(err, users) {
    res.json(users);
  });
});   

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);


app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


