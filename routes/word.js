var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();



// word 전체 데이터 받아오기
router.get('/', useAuthCheck, (req,res,next)=>{


    let sql = `SELECT * FROM vocas`;
    dbctrl((connection) => {
        connection.query(sql, (error,results,fields) =>{
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

//word 중 completed 만 받아오기
router.get('/completed',useAuthCheck,(req,res,next)=>{
    let sql = `SELECT * FROM vocas WHERE completed = 1`;
    dbctrl((connection) => {
        connection.query(sql,(error,results,fields)=>{
            connection.release();
            if(error) res.status(400).json(error);
            else res.json(results);
        });
    });
});


// word random으로 불러오기 
router.get('/random' ,useAuthCheck,(req,res,next)=>{
    let sql = `SELECT word FROM vocas order by rand()LIMIT 1`;
    dbctrl((connection)=>{
        connection.query(sql,(error,results,fields)=>{
            connection.release();
            if(error) res.status(400).json(error);
            else res.json(results);
        });
    });
});



module.exports = router;