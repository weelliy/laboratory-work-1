const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'vladkrutoy',
    database: 'todolist',
};

async function retrieveListItems() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'SELECT id, text FROM items';
        const [rows] = await connection.execute(query);
        await connection.end();
        return rows;
    } catch (error) {
        console.error('Error retrieving list items:', error);
        throw error;
    }
}

async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>
                <input type="text" value="${item.text.replace(/"/g, '&quot;')}" id="edit-${item.id}" />
            </td>
            <td>
                <button onclick="deleteItem(${item.id})">×</button>
                <button onclick="editItem(${item.id})">✎</button>
            </td>
        </tr>
    `).join('');
}

async function handleRequest(req, res) {
    if (req.url === '/add-item' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                if (!data.text || data.text.trim() === '') {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Empty text');
                    return;
                }

                const connection = await mysql.createConnection(dbConfig);
                await connection.execute('INSERT INTO items (text) VALUES (?)', [data.text.trim()]);
                await connection.end();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success' }));
            } catch (err) {
                console.error('Error inserting item:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server error');
            }
        });
        return;
    }

    if (req.url === '/delete-item' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                if (!data.id) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('No ID provided');
                    return;
                }

                const connection = await mysql.createConnection(dbConfig);
                await connection.execute('DELETE FROM items WHERE id = ?', [data.id]);
                await connection.end();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success' }));
            } catch (err) {
                console.error('Error deleting item:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server error');
            }
        });
        return;
    }

    if (req.url === '/edit-item' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                if (!data.id || !data.text || data.text.trim() === '') {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Invalid ID or text');
                    return;
                }

                const connection = await mysql.createConnection(dbConfig);
                await connection.execute('UPDATE items SET text = ? WHERE id = ?', [data.text.trim(), data.id]);
                await connection.end();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success' }));
            } catch (err) {
                console.error('Error editing item:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server error');
            }
        });
        return;
    }

    if (req.url === '/' && req.method === 'GET') {
        try {
            const html = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
        }
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Route not found');
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
