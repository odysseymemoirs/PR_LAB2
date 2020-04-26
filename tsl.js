const http = require('http');
const fs = require('fs');
const tls = require('tls');
const { URL } = require('url');
const numCPUs = require('os').cpus().length;
let cluster = require('cluster');



const imgServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'image/jpg' });
    res.end('okay');
});

imgServer.on('connect', (req, clientSocket, head) => {
    const { port, hostname } = new URL(`https://${req.url}`);

    
    const serverSocket = tls.connect(443, hostname, () => {

        console.log("2. Image Server открывает tcp соединение с ", hostname)
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
            'Proxy-agent: Node.js-Proxy\r\n' +
            '\r\n');
        serverSocket.write(head);
        clientSocket.on('close', () => { console.log('6. Image Сервер закрывает tcp соединение с', hostname) })

        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);

    });
})
imgServer.on('error', (e) => {
    console.log("error: ", e)
    process.exit(0)
});
imgServer.on('close', () => {
    console.log("5. Закрываем соединение с Image сервером")
});

imgServer.listen(9000, 'localhost')

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end('okay');
});

server.on('connect', (req, clientSocket, head) => {
    const { port, hostname } = new URL(`https://${req.url}`);

    const serverSocket = tls.connect(443, hostname, () => {
        console.log(' connected to utm with tsl connection');

        clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
            'Proxy-agent: Node.js-Proxy\r\n' +
            '\r\n');

        serverSocket.write(head);
        clientSocket.on('close', () => { console.log('8. Сервер 1 закрывает tcp соединение с ', hostname) })

        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
    })
});
server.on('close', () => {
    console.log("7. Закрываем соединение с сервером 1")
});
server.on('error', (e) => {
    console.log("error: ", e)
    process.exit(0)
});
server.listen(1337, 'localhost', (port) => {
    const options = {
        port: 1337,
        host: 'localhost',
        method: 'CONNECT',
        path: 'utm.md'
    };


    const req = http.request(options);
    req.end(() => { console.log('1. Подключились к серверу') });

    req.on('connect', (res, socket, head) => {

        let dataArray = []

        socket.write('GET / HTTP/1.1\r\n' +
            'Host: utm.md\r\n' +
            'Connection: close\r\n' +
            '\r\n');

        socket.on('data', (chunks) => {
            process.stdout.write("Получаем данные:  " + chunks.length + "от " + options.path + "\r");
            dataArray.push(chunks)
        });
        socket.on('end', () => {
            fs.writeFileSync('utm', dataArray)
            socket.end()
            server.close();
            console.log("3. Получаем данные от " + options.path)
            console.log('4. Данные полечены')
            imageUrlHandle(dataArray);
        });
    });

});





function imageUrlHandle(page) {
    console.log('5. Вытаскиваем ссылки из страницы')
    fs.writeFileSync('1.htmlPage.txt', page.toString())
    // вытаскиваем из всей страницы только ссылки картинок
    let imageUrlArray = page.toString().match(/[^"\'=\s]+\.(jpe?g|png|gif)/g)
    fs.writeFileSync('2_url.txt', imageUrlArray.join('\n'))
    let arr = new Array

    for (let i = 0; i < imageUrlArray.length - 1; i++) {

        // вытаскиваю только хорошие картинки, типа https://utm.md/wp-content/uploads/2020/03/Tînărul-creator-site1-1500x430.jpg
        let urlRegex = /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/igm
        // отделяю имя хоста utm.md
        let urlHostRegex = /\/\/([^\/,\s]+\.[^\/,\s]+?)(?=\/|,|\s|$|\?|#)/g;
        // отделяю ссылку картинки от хоста /wp-content/uploads/2020/03/Tînărul-creator-site1-1500x430.jpg
        let imgLinkRegex = /^(?:(ftp|http|https):\/\/)?(?:[a-zA-Z]+\.){0,1}(?:[a-zA-Z0-9][a-zA-Z0-9-]+){1}(?:\.[a-zA-Z]{2,6})?(\/|\/\w\S*)?$/

        url = urlRegex.exec(imageUrlArray[i])
        urlHost = urlHostRegex.exec(url) 
        imgLink = imgLinkRegex.exec(url)
        if (url) {

            arr.push({
                host: urlHost[1],
                url: imgLink[2]
              }) 
        }
    }
    console.log('6. Было получено: ', arr.length, ' ссылок')
    fs.writeFileSync('3_url.txt', arr.map((e,i)=>{return ` ${i} ${Object.values(e)}\n`}))
   connect(arr);
}
function connect(arr) {

    const options = {
        port: 9000,
        host: 'localhost',
        method: 'CONNECT',
        path: 'utm.md'
    };

    const req = http.request(options);
    req.end(() => { console.log('1. Подключаемся к Image Server') });


    req.on('connect', (res, socket, head) => {

        for (let i = 0; i < arr.length; i++) {
            socket.write(`GET ${arr[i].url} HTTP/1.1\r\n`)
            socket.write(`Host: ${arr[i].host}\r\n`)
            socket.write(`Connection: keep-alive\r\n`)
            socket.write(`\r\n`)
        }
        //   socket.write(`GET /images/newsletter.png HTTP/1.1\r\n` +
        //   'Host: unite.md\r\n' +
        //  'Connection: close\r\n' +
        //   //'Keep-Alive: timeout=10, max=100000\r\n' +
        //   '\r\n');

        socket.on('close', function (error) {
        });

        var buffer = new Buffer.from("0", 'binary');

        socket.on('data', (data) => {
            process.stdout.write("Получаем данные:  " + data.length + " bytes\r");
            buffer = Buffer.concat([buffer, new Buffer.from(data, 'binary')]);
        });

        socket.on('end', () => {
            socket.end()
            imgServer.close()
            console.log("3. Получаем данные:")
            console.log('4. Данные получены')
            setTimeout(() => {
                parseImages(buffer)
            }, 1000);
            fs.writeFileSync('4_buffer.txt', buffer)
        })
    })

}
function parseImages(data) {

    

    // createImage(removeHeaderInfo(data))
    removeHeaderInfo(data)

}
function removeHeaderInfo(buffer) {
   
    
    console.log('7. Удаляем код header')

    let asciiStringBuffer = JSON.parse(JSON.stringify(buffer))
    fs.writeFileSync('5_asciiBuffer.txt', asciiStringBuffer.data)

    let dataArray = asciiStringBuffer.data;
    let imgArrayWithoutHeader = []
    let imgStart = 0;
    let imgEnd = 0;

    for (let i = 0; i < dataArray.length; i++) {
        if(!imgStart) {
            if (dataArray[i] == 13 && dataArray[i + 1] == 10 && dataArray[i + 2] == 13 && dataArray[i + 3] == 10) {
                imgStart = i + 4;
               
            }
        }
        if(imgStart && !imgEnd) {
            if (dataArray[i] == 72 && dataArray[i + 1] == 84 && dataArray[i + 2] == 84 && dataArray[i + 3] == 80 && imgStart != 0) {
                imgEnd = i - 2
               
            }
        }
        if(imgStart && imgEnd) {
            // imgArrayWithoutHeader.push(dataArray.slice(imgStart, imgEnd))
            let tmp = []
             tmp.push(dataArray.slice(imgStart,imgEnd))
            createImage(tmp)
            imgStart = 0;
            imgEnd = 0;
        }
     
    }
    if (imgStart && !imgEnd) {
        // значит у нас 1 картинка
        imgArrayWithoutHeader.push(dataArray.slice(imgStart, dataArray.length))
        imgStart = 0;
        imgEnd = 0;
    }
    
    return imgArrayWithoutHeader
}
 function createImage(arr) {

    console.log('8. Создаются ', arr.length, ' картинок')
    for (i = 0; i < arr.length; i++) {
        // переводим массив из binary ascii code (JSON) кода в base64 а затем в buffer 
        let buff = new Buffer.from(arr[i], 'base64');
        // из buffer создаем png файл
        let path = './images/'
        let rand = Date.now()
        let localPath = path + rand + '.gif';
        

            fs.writeFile(localPath, buff ,(err) => {
           
            if (err) throw err;
      
            process.stdout.write("Картинка:  " + i + "создана " + "\r");
        })

    }
    console.log('9. Картинки созданы. Готово!')
}



