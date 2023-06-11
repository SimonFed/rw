const express = require('express')
const mysql = require('mysql');
const path = require('path');
const app = express();
const session = require('express-session');
const fileUpload = require("express-fileupload");
const { log } = require('console');
app.use(session({ secret: "Secret", resave: false, saveUninitialized: true }));

app.use(fileUpload());

require('dotenv').config()
// Соединение с базой данных
const connection = mysql.createConnection({
    host: process.env.HOST,
    database: process.env.BASE,
    user: process.env.USER,
    password: process.env.PASSWORD
});

connection.connect((err) => {
    if (err) {
        console.log(err);
    }
});

// Путь к директории файлов ресурсов (css, js, images)
app.use(express.static('public'));

// Настройка шаблонизатора
app.set('view engine', 'ejs');

// Путь к директории файлов отображения контента
app.set('views', path.join(__dirname, 'views'));

// Обработка POST-запросов из форм
app.use(express.urlencoded({ extended: true }));

// Запуск веб-сервера по адресу http://localhost:3000
app.listen(3000);


// Middleware
function isAuth(req, res, next) {
    if (req.session.auth) {
        next();
    } else {
        res.redirect('/');
    }
};
/**
 * Маршруты
 */
app.get('/', (req, res) => {
    const itemsPerPage = 4;
    let page = parseInt(req.query.page); // localhost?page=4
    if (!page) page = 1;

    connection.query('SELECT count(id) as count from items', (err, data, fields) => {
        const count = data[0].count;
        const pages = Math.ceil(count / itemsPerPage);

        if (err) {
            console.log(err);
        }

        if (page > pages) {
            page = pages;
        }

        connection.query("SELECT * FROM items LIMIT ? OFFSET ?", [[itemsPerPage], [itemsPerPage * (page - 1)]], (err, data, fields) => {
            res.render('home', {
                'items': data,
                'currentPage' : page,
                'totalPages': pages,
            });
        });
    })
})

app.get('/items/:id', (req, res) => {
    connection.query("SELECT * FROM items WHERE id=?", [req.params.id],
        (err, data, fields) => {
            if (err) {
                console.log(err);
            }

            res.render('item', {
                'item': data[0],
            })
        });
})

app.get('/add', isAuth,(req, res) => {
    res.render('add')
})

app.post('/delete', isAuth,(req, res) => {
    connection.query(
        "DELETE FROM items WHERE id=?", [[req.body.id]], (err, data, fields) => {
            if (err) {
                console.log(err);
            }
            res.redirect('/');
        }
    );
})

app.post('/update', isAuth,(req, res) => {
    connection.query(
        "UPDATE items SET title=?, image=? WHERE id=?", [[req.body.title],[req.body.image],[req.body.id]], (err, data, fields) => {
            if (err) {
                console.log(err);
            }
            res.redirect('/');
        }
    );
})

app.get('/auth', (req,res) => {
    res.render('auth');

});



app.post('/auth', (req, res) => {
    connection.query(
        "SELECT * FROM users WHERE name=? and password=?",
        [[req.body.name], [req.body.password]],
        (err, data, fields) => {
            if (err) {
                console.log(err);
            }
            if (data.length > 0) {
                req.session.auth = true;       
            }
            res.redirect('/');
        }
    );
})

app.post('/open', (req, res) => {
    connection.query(
        "INSERT INTO users (name, password) VALUES (?, ?);", [[req.body.name], [req.body.password]], (err, data, fields) => {
        if (err) {
            console.log(err);
        }
        res.redirect('/');
    })

})




app.post("/upload", function (req, res) {
  
    // When a file has been uploaded
    if (req.files && Object.keys(req.files).length !== 0) {
      
      // Uploaded path
      const uploadedFile = req.files.uploadFile;
    
      // Logging uploading file
    //   console.log(uploadedFile);
    
      // Upload path
      const uploadPath = __dirname
          + "/public/img/" + uploadedFile.name;
    
      // To save the file using mv() function
      uploadedFile.mv(uploadPath, function (err) {
        if (err) {
          console.log(err);
          res.send("Failed !!");
        } else {
            // console.log(uploadedFile.name);
            connection.query(
                "INSERT INTO items (title, image) VALUES (?, ?)",
                [[req.body.title], [uploadedFile.name]],
                (err, data, fields) => {
                    if (err) {
                        console.log(err);
                    }
                    
                    res.redirect('/');
                }
            );
        
        }
      });
    }
  });
    
  // To handle the download file request
  app.get("/download", function (req, res) {
    
    // The res.download() talking file path to be downloaded
    res.download(__dirname , function (err) {
      if (err) {
        console.log(err);
      }
    });
  });