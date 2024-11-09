const express = require('express')
const app = express()
const port = 9001
app.use(express.json());

var cors = require('cors')
app.use(cors())

require('dotenv').config()

const bcrypt = require('bcrypt');

const fs = require('fs');

var jwt = require('jsonwebtoken');

const multer  = require('multer')

let mystorage = multer.diskStorage({
    destination: (req, file, cb) => 
    {
      cb(null, "public/uploads");//we will have to create folder ourselves
    },
    filename: (req, file, cb) => 
    {
        var picname = Date.now() + file.originalname;//1711956271167oil3.webp
        //milliseconds will be added with original filename and name will be stored in picname variable
        cb(null, picname);
    }
  });
  let upload = multer({ storage: mystorage });


const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service : 'hotmail',
    auth : {
        user : `${process.env.SMTP_UNAME}`,
        pass : `${process.env.SMTP_PASS}`
    }
  })


  function verifytoken(req,res,next)
  {
    if(!req.headers.authorization)
    {
      res.status(401).send('Unauthorized Subject')
    }
    let token = req.headers.authorization.split(' ')[1]
    if(token=='null')
    {
      return res.status(401).send('Unauthorized request')
    }
    let payload = jwt.verify(token, 'Hjkjh&*^&*^234234Hkjhkjdsakkj')//username
    if(!payload)
    {
      return res.status(401).send('Unauthorized Request')
    }
    next()
  }

const mongoose = require('mongoose');

// mongoose.connect('mongodb://127.0.0.1:27017/projectdb').then(() => console.log('Connected to MongoDB!'));

mongoose.connect('mongodb+srv://dbuser:dbpass123@cluster0.oapfi.mongodb.net/projdb?retryWrites=true&w=majority&appName=Cluster0').then(() => console.log('Connected to MongoDB!'));

var signupSchema = mongoose.Schema({pname:String,phone:String,username:{type:String,unique:true},password:String,usertype:String, activated:Boolean},{versionKey:false})

var SignupModel = mongoose.model("signup",signupSchema,"signup");// internal name, schema_name, real collection_name

app.post("/api/signup",async(req,res)=>
{
    const hash = bcrypt.hashSync(req.body.pass, 10);
    var newrecord = new SignupModel({pname:req.body.name,phone:req.body.phone,username:req.body.uname,password:hash,usertype:"normal",activated:false})    
    //this will create a temp record into the model, not in real collection

    var result = await newrecord.save();//it will save the record into real collection
    console.log(result);
    if(result)
    {
        const mailOptions = 
        {
        from: 'groceryplanet@hotmail.com',//smtp email
        to: req.body.uname,
        subject: 'Activation mail from GroceryWorld.com',
        html: `Hello ${req.body.name}<br/><br/>Thanks for signing up on our website. Click on the following link to activate your account<br/><br/><a href='http://localhost:3000/activateaccount?actcode=${result._id}'>Activate Account</a><br><br>Team GroceryWorld.com `
        };
    
      // Use the transport object to send the email
        transporter.sendMail(mailOptions, (error, info) => 
        {
            if (error) 
            {
                console.log(error);
                res.send({statuscode:0, msg:', Signup done, but error sending email'});
            } 
            else 
            {
                console.log('Email sent: ' + info.response);
                res.status(200).send({statuscode:1,msg:"Signup Successfull, check your mail to activate account"})
            }
        });
        
    }
    else
    {
        res.status(200).send({statuscode:0,msg:"Signup not successfull"})
    }    
})

app.post("/api/addadmin",async(req,res)=>
    {
        const hash = bcrypt.hashSync(req.body.pass, 10);
        var newrecord = new SignupModel({pname:req.body.name,phone:req.body.phone,username:req.body.uname,password:hash,usertype:"admin"})    
        //this will create a temp record into the model, not in real collection
    
        var result = await newrecord.save();//it will save the record into real collection
        
        if(result)
        {
            res.status(200).send({statuscode:1,msg:"Admin added successfuly"})
        }
        else
        {
            res.status(500).send({statuscode:0,msg:"Admin not added"})
        }    
    })

app.post("/api/login",async(req,res)=>
{
    var result = await SignupModel.findOne({username:req.body.uname});
    var result2 = await SignupModel.findOne({username:req.body.uname}).select("-password").select("-phone");
    if(!result)
    {
        res.status(200).send({statuscode:0})
    }
    else
    {
        var compres = bcrypt.compareSync(req.body.pass, result.password);
        if(compres===true)
        {
            if(result.usertype==="admin")
            {
                //token issue
                var jtoken = jwt.sign({exp: Math.floor(Date.now() / 1000) + (60 * 60),
                    data: result.username}, 'Hjkjh&*^&*^234234Hkjhkjdsakkj');
                    
                res.status(200).send({statuscode:1,pdata:result2, token:jtoken})
            }
            else
            {
                res.status(200).send({statuscode:1,pdata:result2})
            }
        }
        else
        {
            res.status(200).send({statuscode:0})
        }
    }    
})

app.get("/api/searchuser/:uname",async(req,res)=>
{
    var result = await SignupModel.findOne({username:req.params.uname})
    //result will become a json object because findOne function returns a json object
    if(result)
    {
        res.status(200).send({statuscode:1,searchdata:result})
    }
    else
    {
        res.status(200).send({statuscode:0})
    }    
})

app.get("/api/getallusers",async(req,res)=>
{
    var result = await SignupModel.find();
    //result will become an array because find function returns an array
    if(result.length===0)
    {
        res.status(200).send({statuscode:0})
    }
    else
    {
        res.status(200).send({statuscode:1,membersdata:result})
    }    
})

app.delete("/api/deluser/:uid",async(req,res)=>
{
    var result = await SignupModel.deleteOne({_id:req.params.uid})//{ acknowledged: true, deletedCount: 1 }
    if(result.deletedCount===1)
    {
        res.status(200).send({statuscode:1})
    }
    else
    {
        res.status(200).send({statuscode:0})
    }    
})


app.put("/api/changepassword",async(req,res)=>
{
    try
    {
        var result = await SignupModel.findOne({username:req.body.uname});
        if(!result)//invalid username
        {
            res.status(200).send({statuscode:0})
        }
        else//valid username and we will get full json record of user in result variable
        {
            var compres = bcrypt.compareSync(req.body.currpass, result.password);
            //comparing current plain password with encrypted password stored in db

            if(compres===true)
            {
                const hash = bcrypt.hashSync(req.body.newpass, 10);
                var updateresult = await SignupModel.updateOne({username: req.body.uname}, { $set: {password:hash}});

                if(updateresult.modifiedCount===1)
                {
                    res.status(200).send({statuscode:1})
                }
                else
                {
                    res.status(200).send({statuscode:0})
                }
            }
            else
            {
                res.status(200).send({statuscode:0})
            }
        }    
    }
    catch(e)
    {
        console.log(e);
        res.status(500).send({statuscode:-1,msg:"Some error occured"})
    }
})

app.put("/api/activateaccount",async(req,res)=>
    {
        try
        {
            var updateresult = await SignupModel.updateOne({_id: req.query.code}, { $set: {activated:true}});

            if(updateresult.modifiedCount===1)
            {
                res.status(200).send({msg:"Account activated successfully"})
            }
            else
            {
                res.status(200).send({msg:"Account not activated"})
            }
               
        }    
        catch(e)
        {
            console.log(e);
            res.status(500).send({statuscode:-1,msg:"Some error occured"})
        }
    })


app.get("/api/forgotpass",async(req,res)=>
    {
        var result = await SignupModel.findOne({username:req.query.un})

        if(!result)
        {
            res.status(200).send({msg:"Incorrect Username"})
        }
        else
        {
            const mailOptions = 
            {
            from: 'groceryplanet@hotmail.com',//smtp email
            to: req.query.un,
            subject: 'Reset password mail from GroceryWorld.com',
            html: `Hello ${result.pname}<br/><br/>Click on the following link to reset your password<br/><br/><a href='http://localhost:3000/resetpassword?code=${result._id}'>Reset Password</a><br><br>Team GroceryWorld.com `
            };
        
          // Use the transport object to send the email
            transporter.sendMail(mailOptions, (error, info) => 
            {
                if (error) 
                {
                    console.log(error);
                    res.send({msg:'Error while sending mail, try again'});
                } 
                else 
                {
                    console.log('Email sent: ' + info.response);
                    res.status(200).send({msg:"Check your email to reset your password"})
                }
            });
        }    
    })


app.put("/api/resetpass",async(req,res)=>
    {
        try
        {
            const hash = bcrypt.hashSync(req.body.pass, 10);
            var updateresult = await SignupModel.updateOne({_id: req.body.id}, { $set: {password:hash}});

            if(updateresult.modifiedCount===1)
            {
                res.status(200).send({msg:"Password reset successfully"})
            }
            else
            {
                res.status(200).send({msg:"Problem while resetting password"})
            }
        }
        catch(e)
        {
            console.log(e);
            res.status(500).send({msg:"Some error occured"})
        }
    })

var catSchema = mongoose.Schema({catname:String,catpic:String},{versionKey:false})

var CatModel = mongoose.model("category",catSchema,"category");// internal name, schema_name, real collection_name

app.post("/api/savecategory",verifytoken,upload.single('catpic'),async(req,res)=>
{
    var picturename;
    if(!req.file)
    {
        picturename="noimage.jpg";
    }
    else
    {
        picturename=req.file.filename;
    }
    var newrecord = new CatModel({catname:req.body.catname,catpic:picturename})    
    var result = await newrecord.save();
    if(result)
    {
        res.status(200).send({statuscode:1})
    }
    else
    {
        res.status(200).send({statuscode:0})
    }    
})

app.get("/api/getallcat",async(req,res)=>
{
    var result = await CatModel.find();
    //result will become an array because find function returns an array
    if(result.length===0)
    {
        res.status(200).send({statuscode:0})
    }
    else
    {
        res.status(200).send({statuscode:1,catdata:result})
    }    
})


app.put("/api/updatecategory",upload.single('catpic'),async(req,res)=>
{
    try
    {
        var picturename;
        if(!req.file)
        {
            picturename=req.body.oldpicname;//it will save current picname in this variable
        }
        else
        {
            picturename=req.file.filename;

            if(req.body.oldpicname!=="noimage.jpg")
            {
                fs.unlinkSync(`public/uploads/${req.body.oldpicname}`);
            }
        }

        var updateresult = await CatModel.updateOne({ _id: req.body.cid }, { $set: {catname:req.body.catname,catpic:picturename}});

        if(updateresult.modifiedCount===1)
        {
            res.status(200).send({statuscode:1})
        }
        else
        {
            res.status(500).send({statuscode:0})
        }
    }
    catch(e)
    {
        console.log(e);
        res.status(500).send({statuscode:-1,msg:"Some error occured"})
    }
})


var subcatSchema = mongoose.Schema({catid:String,subcatname:String,subcatpic:String},{versionKey:false})

var SubCatModel = mongoose.model("subcategory",subcatSchema,"subcategory");// internal name, schema_name, real collection_name

app.post("/api/savesubcategory",upload.single('picture'),async(req,res)=>
{
    var picturename;
    if(!req.file)
    {
        picturename="noimage.jpg";
    }
    else
    {
        picturename=req.file.filename;
    }
    var newrecord = new SubCatModel({catid:req.body.cid,subcatname:req.body.subcatname,subcatpic:picturename})    
    var result = await newrecord.save();
    if(result)
    {
        res.status(200).send({statuscode:1})
    }
    else
    {
        res.status(200).send({statuscode:0})
    }    
})

app.get("/api/getsubcatbycat/:cid",async(req,res)=>
{
    var result = await SubCatModel.find({catid:req.params.cid})
    //result will become an array because find function returns an array
    if(result.length===0)
    {
        res.status(200).send({statuscode:0})
    }
    else
    {
        res.status(200).send({statuscode:1,subcatinfo:result})
    }    
})


app.put("/api/updatesubcategory",upload.single('picture'),async(req,res)=>
{
    try
    {
        var picturename;
        if(!req.file)
        {
            picturename=req.body.oldpicname;//it will save current picname in this variable
        }
        else
        {
            picturename=req.file.filename;
            if(req.body.oldpicname!=="noimage.jpg")
            {
                fs.unlinkSync(`public/uploads/${req.body.oldpicname}`);
            }
        }

        var updateresult = await SubCatModel.updateOne({ _id: req.body.scid }, { $set: {catid:req.body.cid,subcatname:req.body.scname,subcatpic:picturename}});

        if(updateresult.modifiedCount===1)
        {
            res.status(200).send({statuscode:1})
        }
        else
        {
            res.status(500).send({statuscode:0})
        }
    }
    catch(e)
    {
        console.log(e);
        res.status(500).send({statuscode:-1,msg:"Some error occured"})
    }
})

var prodSchema = mongoose.Schema({catid:String,subcatid:String,pname:String,Rate:Number,Discount:Number,Stock:Number,Description:String,picture:String,addedon:String},{versionKey:false})

var ProdModel = mongoose.model("product",prodSchema,"product");// internal name, schema_name, real collection_name

app.post("/api/saveproduct",upload.single('picture'),async(req,res)=>
{
    var picturename;
    if(!req.file)
    {
        picturename="noimage.jpg";
    }
    else
    {
        picturename=req.file.filename;
    }
    var newrecord = new ProdModel({catid:req.body.catid,subcatid:req.body.subcatid,pname:req.body.pname,Rate:req.body.rate,Discount:req.body.dis,Stock:req.body.stock,Description:req.body.descp,picture:picturename,addedon:new Date()}) 

    var result = await newrecord.save();

    if(result)
    {
        res.status(200).send({statuscode:1})
    }
    else
    {
        res.status(200).send({statuscode:0})
    }    
})


app.put("/api/updateproduct",upload.single('pic'),async(req,res)=>
    {
        try
        {
            var picturename;
            if(!req.file)
            {
                picturename=req.body.oldpicname;//it will save current picname in this variable
            }
            else
            {
                picturename=req.file.filename;
    
                if(req.body.oldpicname!=="noimage.jpg")
                {
                    fs.unlinkSync(`public/uploads/${req.body.oldpicname}`);
                }
            }
    
            var updateresult = await ProdModel.updateOne({ _id: req.body.pid }, { $set: {catid:req.body.cid,subcatid:req.body.scid,pname:req.body.prodname,Rate:req.body.rate,Discount:req.body.dis,Stock:req.body.stock,Description:req.body.descrip,picture:picturename}});
    
            if(updateresult.modifiedCount===1)
            {
                res.status(200).send({statuscode:1})
            }
            else
            {
                res.status(500).send({statuscode:0})
            }
        }
        catch(e)
        {
            console.log(e);
            res.status(500).send({statuscode:-1,msg:"Some error occured"})
        }
    })

app.get("/api/fetchprodsbycatid",async(req,res)=>
{
    var result = await ProdModel.find({catid:req.query.cid})
    //result will become an array because find function returns an array
    if(result.length===0)
    {
        res.status(200).send({statuscode:0})
    }
    else
    {
        res.status(200).send({statuscode:1,proddata:result})
    }    
})

app.get("/api/fetchprodsbysubcatid",async(req,res)=>
    {
        var result = await ProdModel.find({subcatid:req.query.scid})
        //result will become an array because find function returns an array
        if(result.length===0)
        {
            res.status(200).send({statuscode:0})
        }
        else
        {
            res.status(200).send({statuscode:1,proddata:result})
        }    
    })

app.get("/api/fetchnewprods",async(req,res)=>
{
    var result = await ProdModel.find().sort({"addedon":-1}).limit(6)
    //result will become an array because find function returns an array
    if(result.length===0)
    {
        res.status(200).send({statuscode:0})
    }
    else
    {
        res.status(200).send({statuscode:1,proddata:result})
    }    
})

app.get("/api/searchproducts",async(req,res)=>
{
    var searchtext = req.query.q;
    var result = await ProdModel.find({pname: { $regex: '.*' + searchtext ,$options:'i' }})
    //result will become an array because find function returns an array
    if(result.length===0)
    {
        res.status(200).send({statuscode:0})
    }
    else
    {
        res.status(200).send({statuscode:1,proddata:result})
    }    
})


app.get("/api/getproddetails",async(req,res)=>
    {
        var result = await ProdModel.find({_id:req.query.pid})
        //result will become an array because find function returns an array
        if(result.length===0)
        {
            res.status(200).send({statuscode:0})
        }
        else
        {
            res.status(200).send({statuscode:1,proddata:result[0]})
        }    
    })



var cartSchema = mongoose.Schema({pid:String,picture:String,ProdName:String,Rate:Number,Qty:Number,TotalCost:Number,Username:String},{versionKey:false})

var CartModel = mongoose.model("cart",cartSchema,"cart");// internal name, schema_name, real collection_name

app.post("/api/savetocart",async(req,res)=>
{

    var newrecord = new CartModel({pid:req.body.pid,picture:req.body.picture,ProdName:req.body.pname,Rate:req.body.rate,Qty:req.body.qty,TotalCost:req.body.tc,Username:req.body.username}) 

    var result = await newrecord.save();

    if(result)
    {
        res.status(200).send({statuscode:1})
    }
    else
    {
        res.status(200).send({statuscode:0})
    }    
})

app.get("/api/getcart",async(req,res)=>
{
    try
    {
        var result = await CartModel.find({Username:req.query.un})
        //result will become an array because find function returns an array
        if(result.length===0)
        {
            res.status(200).send({statuscode:0})
        }
        else
        {
            res.status(200).send({statuscode:1,cartinfo:result})
        }
    }
    catch(e)
    {
        res.status(500).send({statuscode:-1,errmsg:e.message})
    }
})


var orderSchema = mongoose.Schema({saddress:String,billamt:Number,username:String,OrderDate:String,PayMode:String,CardDetails:Object,OrderProducts:[Object],status:String},{versionKey:false})

var OrderModel = mongoose.model("finalorder",orderSchema,"finalorder");

app.post("/api/saveorder",async(req,res)=>
{

    var newrecord = new OrderModel({saddress:req.body.saddr,billamt:req.body.tbill,username:req.body.uname,OrderDate:new Date(),PayMode:req.body.pmode,CardDetails:req.body.carddetails,OrderProducts:req.body.cartinfo,status:"Payment received, processing"}) 

    var result = await newrecord.save();

    if(result)
    {
        res.status(200).send({statuscode:1})
    }
    else
    {
        res.status(200).send({statuscode:0})
    }    
})

app.put("/api/updatestock",async(req,res)=>
{
    try
    {
        var cartdata = req.body.cartinfo;
        for(var x=0;x<cartdata.length;x++)
        {
            var updateresult = await ProdModel.updateOne({_id: cartdata[x].pid}, {$inc:{"Stock":-cartdata[x].Qty}});
        }
        if(updateresult.modifiedCount===1)
        {
            res.status(200).send({statuscode:1})
        }
        else
        {
            res.status(200).send({statuscode:0})
        }
    }
    catch(e)
    {
        console.log(e);
        res.status(500).send({statuscode:-1,msg:"Some error occured"})
    }
})

app.delete("/api/deletecart",async(req,res)=>
{
    var result = await CartModel.deleteMany({Username:req.query.un})//{ acknowledged: true, deletedCount: ... }
    if(result.deletedCount>=1)
    {
        res.status(200).send({statuscode:1})
    }
    else
    {
        res.status(200).send({statuscode:0})
    }    
})

app.get("/api/getorderid",async(req,res)=>
    {
        try
        {
            var result = await OrderModel.findOne({username:req.query.un}).sort({"OrderDate":-1});
            if(result)
            {
                res.status(200).send({statuscode:1,orderdata:result})
            }
            else
            {
                res.status(200).send({statuscode:0})
            }
        }
        catch(e)
        {
            res.status(500).send({statuscode:-1,errmsg:e.message})
        }
    })

app.get("/api/getallorders",async(req,res)=>
{
    var result = await OrderModel.find().sort({"OrderDate":-1})
    //result will become an array because find function returns an array
    if(result.length===0)
    {
        res.status(200).send({statuscode:0})
    }
    else
    {
        res.status(200).send({statuscode:1,ordersdata:result})
    }    
})

app.get("/api/getuserorders",async(req,res)=>
{
    var result = await OrderModel.find({username:req.query.un}).sort({"OrderDate":-1})

    if(result.length===0)
    {
        res.status(200).send({statuscode:0})
    }
    else
    {
        res.status(200).send({statuscode:1,ordersdata:result})
    }    
})

app.get("/api/getorderproducts",async(req,res)=>
{
    var result = await OrderModel.findOne({_id:req.query.orderno});
    if(result.length===0)
    {
        res.status(200).send({statuscode:0})
    }
    else
    {
        res.status(200).send({statuscode:1,items:result.OrderProducts})
    }    
})


app.put("/api/updatestatus",async(req,res)=>
{
    try
    {
        var updateresult = await OrderModel.updateOne({_id: req.body.orderid}, { $set: {status:req.body.newst}});

        if(updateresult.modifiedCount===1)
        {
            res.status(200).send({statuscode:1})
        }
        else
        {
            res.status(200).send({statuscode:0})
        }
    }
    catch(e)
    {
        console.log(e);
        res.status(500).send({statuscode:-1,msg:"Some error occured"})
    }
})


app.post("/api/contactus",async (req, res)=> 
    {
        const mailOptions = 
        {
        from: 'groceryplanet@hotmail.com',//smtp email
        to: 'gtbtrial@gmail.com',//any email id of admin or where you want to receive email
        subject: 'Message from Website - Contact Us',
        text: `Name:- ${req.body.pname}\nPhone:-${req.body.phone}\nEmail:-${req.body.email}\nMessage:-${req.body.message}`
        };
    
      // Use the transport object to send the email
      transporter.sendMail(mailOptions, (error, info) => 
      {
        if (error) 
        {
          console.log(error);
          res.send({msg:'Error sending email'});
        } 
        else 
        {
          console.log('Email sent: ' + info.response);
          res.send({msg:"Message sent successfully"});
        }
      });
    
    });

app.listen(port,()=>
{
    console.log("Server is running on " + port);
})