const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Orders storage (in production, use a proper database)
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Initialize orders file if it doesn't exist
async function initializeOrdersFile() {
    try {
        await fs.access(ORDERS_FILE);
    } catch {
        await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2));
    }
}

// Save order endpoint
app.post('/api/orders', async (req, res) => {
    try {
        console.log('Received order:', req.body);
        
        // Read existing orders
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const orders = JSON.parse(ordersData);
        
        // Add new order
        orders.push(req.body);
        
        // Save back to file
        await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
        
        console.log(`Order ${req.body.orderId} saved successfully`);
        
        res.json({
            success: true,
            orderId: req.body.orderId,
            message: 'Order saved successfully'
        });
        
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save order'
        });
    }
});

// Get order by ID
app.get('/api/orders/:id', async (req, res) => {
    try {
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const orders = JSON.parse(ordersData);
        
        const order = orders.find(o => o.orderId === req.params.id);
        
        if (order) {
            res.json(order);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
        
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Failed to fetch order' });
    }
});

// Get all orders (for admin panel)
app.get('/api/orders', async (req, res) => {
    try {
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const orders = JSON.parse(ordersData);
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// Start server
initializeOrdersFile().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Orders will be saved to: ${ORDERS_FILE}`);
    });
});

// Add these endpoints to your existing server.js file

// Update order status
app.patch('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;
        
        // Validate status
        const validStatuses = ['pending', 'in-progress', 'ready', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        // Read orders
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const orders = JSON.parse(ordersData);
        
        // Find and update order
        const orderIndex = orders.findIndex(o => o.orderId === orderId);
        if (orderIndex === -1) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        orders[orderIndex].status = status;
        orders[orderIndex].lastUpdated = new Date().toISOString();
        
        // Save back to file
        await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
        
        console.log(`Order ${orderId} status updated to ${status}`);
        
        res.json({
            success: true,
            orderId: orderId,
            status: status,
            message: 'Order status updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Failed to update order status' });
    }
});

// Delete order
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        
        // Read orders
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const orders = JSON.parse(ordersData);
        
        // Find order
        const orderIndex = orders.findIndex(o => o.orderId === orderId);
        if (orderIndex === -1) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Remove order
        orders.splice(orderIndex, 1);
        
        // Save back to file
        await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
        
        console.log(`Order ${orderId} deleted`);
        
        res.json({
            success: true,
            message: 'Order deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ message: 'Failed to delete order' });
    }
});

// Get order statistics
app.get('/api/orders/stats', async (req, res) => {
    try {
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const orders = JSON.parse(ordersData);
        
        const stats = orders.reduce((acc, order) => {
            acc.total++;
            acc.byStatus[order.status] = (acc.byStatus[order.status] || 0) + 1;
            
            // Calculate revenue if you add pricing later
            const today = new Date().toDateString();
            const orderDate = new Date(order.timestamp).toDateString();
            if (orderDate === today) {
                acc.todayCount++;
            }
            
            return acc;
        }, {
            total: 0,
            todayCount: 0,
            byStatus: {}
        });
        
        res.json(stats);
        
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ message: 'Failed to get statistics' });
    }
});

// Update entire order (for editing)
app.put('/api/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const updatedOrder = req.body;
        
        // Read orders
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const orders = JSON.parse(ordersData);
        
        // Find and update order
        const orderIndex = orders.findIndex(o => o.orderId === orderId);
        if (orderIndex === -1) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Keep original timestamp and ID
        updatedOrder.orderId = orderId;
        updatedOrder.lastUpdated = new Date().toISOString();
        
        orders[orderIndex] = updatedOrder;
        
        // Save back to file
        await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
        
        console.log(`Order ${orderId} updated`);
        
        res.json({
            success: true,
            order: updatedOrder,
            message: 'Order updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Failed to update order' });
    }
});

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// To run this server:
// 1. npm init -y
// 2. npm install express cors
// 3. node server.js