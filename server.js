const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require("cors")
require("dotenv").config()
const app = express();

const { menuModel } = require('./menuModel');
const { upload } = require('./fileUpload');
const { connectDb } = require('./connectDb');
const { userModel } = require('./useModel');

app.use(express.json());

const allowedOrigins = [
  'https://ztcafe.vercel.app',  
  'https://qr-code-scanner-frontend.onrender.com', 
  'http://localhost:5173'
];

const corsOptions = {
  origin: function (origin, callback) {
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};


app.use(cors(corsOptions))

const conn_str = "mongodb+srv://mintesnotgirma973_db_user:0oXdrWY73ZO5WefX@cluster0.2myqddj.mongodb.net/menuItems?appName=Cluster0"
connectDb(conn_str)



app.post('/api/auth/register', async (req, res) => {
    try {
        const { userName, password } = req.body;
         
        const existingUser = await userModel.findOne({ userName });

        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10); 
        const user = await userModel.create({ userName, password: hashedPassword });
        res.status(201).json({
            success:true,
            data:user
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to register user' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { userName, password } = req.body;
        const user = await userModel.findOne({ userName });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ userId: user._id }, "jwtSecret", { expiresIn: '1h' });
        res.json({
            success:true,
            data:user,
            token
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to login user' });
    }
});

app.patch("/api/updateUser/:id", async(req, res) => {
    console.log("Update user request received for id:", req.params.id);
    console.log("Update data:", req.body);
    
    try {
        // Find the user first
        const user = await userModel.findById(req.params.id);
        
        if(!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        
        // Track what fields are being updated
        const updates = {};
        
        // Update username if provided
        if(req.body.userName && req.body.userName.trim()) {
            user.userName = req.body.userName;
            updates.userName = req.body.userName;
        }
        
        // Update password if provided
        if(req.body.password && req.body.password.trim()) {
            // Validate password length
            if(req.body.password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 6 characters long"
                });
            }
            
            // Hash the new password
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            user.password = hashedPassword;
            console.log("hashedPassword: ",hashedPassword)
            updates.password = "******"; // Masked for logging
        }
        
        // Check if any updates were made
        if(Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields to update. Please provide userName or password"
            });
        }
        
        // Save the updated user
        await user.save();
        
        // Return success response without exposing password
        res.status(200).json({
            success: true,
            message: "User updated successfully",
            updates: updates,
            user: {
                id: user._id,
                userName: user.userName,
                email: user.email
                // Don't send password back
            }
        });
        
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get("/api/user/", async(req,res)=>{
    try {
        const user = await userModel.find();
        res.status(200).json({
            success:true,
            data:user
        })
    } catch (error) {
        res.status(500).json({
            success:false,
            error:error.message
        })
    }
})
app.get('/api/menu',async (req, res) => {
    try {
        const menuItems = await menuModel.find();
        res.json({
            success:true,
            data:menuItems
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

app.post('/api/menu',upload.single("image"), async (req, res) => {
    try {
        const { name, price, description, category } = req.body;

          const menuItem = new menuModel({
            name,
            price: parseFloat(price),
            description,
            category,
            imageUrl: req.file ? req.file.path : "", // Cloudinary URL
            publicId: req.file ? req.file.filename :"" // Cloudinary public_id
            });

            await menuItem.save();

            res.status(201).json({
                success:true,
                data:menuItem
            });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create menu item' });
    }
});

app.patch('/api/menu/:id', upload.single("image"), async (req, res) => {
    try {
        console.log("req.body:", req.body);
        const { name, price, description, category } = req.body;
    const menuItem = await menuModel.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    menuItem.name = name || menuItem.name;
    menuItem.price = price ? parseFloat(price) : menuItem.price;
    menuItem.description = description || menuItem.description;
    menuItem.category = category || menuItem.category;

        if (req.file) {
      // Delete old image from Cloudinary
      await cloudinary.uploader.destroy(menuItem.publicId);
      
      // Update with new image
      menuItem.imageUrl = req.file.path;
      menuItem.publicId = req.file.filename;
    }

        await menuItem.save();
        res.status(200).json({
            success:true,
            data:menuItem
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to update menu item' });

    }
}) ;

app.delete('/api/menu/:id', async (req, res) => {
    try {
        console.log("delete request coming for id:", req.params.id);
        const { id } = req.params;
        const deletedMenuItem = await menuModel.findByIdAndDelete(id);


        if (!deletedMenuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        res.json({
            success:true,
            data:deletedMenuItem
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete menu item' });
    }
});


app.listen(5000, () => {
    console.log('Server is running on port 5000');
});