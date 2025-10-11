const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: './config.env' });


const loadRoute = (name) => {
    try {
        
        return require(path.join(__dirname, 'routes', name));
    } catch (error) {
        console.error(`FATAL ERROR: Failed to load route module '${name}':`, error.message);
       
        throw error;
    }
};


try {
    var authRoutes = loadRoute('auth');
    var adminRoutes = loadRoute('admin');
    var userRoutes = loadRoute('user'); 
    var storeOwnerRoutes = loadRoute('storeowner');
} catch (error) {
    console.error("SERVER ABORT: One or more route files failed to load. Check console for details.");
   
}



const app = express();


app.use(helmet());


app.set('trust proxy', 1);


const limiter = rateLimit({
windowMs: 15 * 60 * 1000, 
 max: 100, 
trustProxy: true
});
app.use(limiter);


app.use(cors({
origin: process.env.CLIENT_URL || 'http://localhost:3000',
credentials: true
}));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/store-rating-system')
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));


app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes); 
app.use('/api/store-owner', storeOwnerRoutes);


app.get('/api/health', (req, res) => {
res.json({ status: 'OK', message: 'Server is running' });
});


app.use((err, req, res, next) => {
 console.error(err.stack);
   res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});


app.use('*', (req, res) => {
res.status(404).json({ 
success: false, 
 message: 'Route not found' 
 });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
