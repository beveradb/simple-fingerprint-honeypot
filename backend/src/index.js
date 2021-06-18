#!/usr/bin/env node
'use strict'
const strftime = require('strftime')

// make a string safe to put in double quotes in CLF
function encode(s) {
  return s.replace(/\\/g, '\\x5C').replace(/"/, '\\x22')
}

const fs = require('fs'),
  http = require('http'),
  accesslog = require('access-log'),
  LISTEN_HOSTNAME = '0.0.0.0',
  LISTEN_PORT = 3000,
  LOG_FILE_PATH = 'requests.log',
  JSON_FILE_PATH = 'requests.json',
  VIEW_FILE_PATH = 'src/view.html',
  ACK_HTTP_CODE = 200,
  ACK_CONTENT_TYPE = 'text/plain'
{
  const server = http.createServer((request, response) => {
    // const viewHTML = fs.readFileSync(VIEW_FILE_PATH)

    var format =
      ':ip - :userID [:clfDate] ":method :url :protocol/:httpVersion" :statusCode ' +
      ':contentLength ":referer" ":userAgent" - Xip=":Xip" host=":host" delta=":delta"'

    accesslog(request, response, format, function (s) {
      console.log(s)
      fs.appendFile(LOG_FILE_PATH, s + '\n', (err) => {})
    })

    // start of new HTTP request
    const requestDataSlabList = [],
      requestURI = request.url

    // wire up request events
    request.on('data', (data) => {
      // add received data to buffer
      requestDataSlabList.push(data)
    })

    request.on('end', (data) => {
      // send response to client

      if (requestURI === '/view') {
        const viewHTML = fs.readFileSync(VIEW_FILE_PATH)
        response.setHeader('Content-Type', 'text/html')
        response.status = 200
        response.write(viewHTML)
      } else if (requestURI === '/fetch') {
        response.setHeader('Content-Type', 'application/json')
        response.status = 200
        const jsonData = []
        try {
          const jsonFileContent = fs.readFileSync(JSON_FILE_PATH)
          jsonFileContent
            .toString()
            .split(/\n/)
            .forEach(function (line) {
              try {
                jsonData.push(JSON.parse(line))
              } catch (err) {
                console.log('Error while parsing JSON line: ', err)
              }
            })
        } catch (err) {
          console.log('Error while reading JSON file: ', err)
        }
        response.write(JSON.stringify(jsonData))
      } else {
        response.writeHead(ACK_HTTP_CODE, {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': ACK_CONTENT_TYPE,
        })
      }

      response.end()

      // write/append received request to file
      const headerItemList = [],
        dataSlab = requestDataSlabList.join('')

      for (const headerItem of Object.keys(request.headers).sort()) {
        headerItemList.push(`\t${headerItem}: ${request.headers[headerItem]}`)
      }

      let bodyStr = ''
      if (dataSlab.length > 0) {
        bodyStr = `\nBody:\n${dataSlab}\n`
      }

      fs.appendFile(LOG_FILE_PATH, `Headers:\n${headerItemList.join('\n')}\n${bodyStr}\n`, (err) => {
        console.log(`End of request, ${dataSlab.length} bytes received.\n`)
      })

      const end = new Date()
      const xip = encode(
        request.headers['x-real-ip'] || request.headers['x-forwarded-for'] || request.connection.remoteAddress || '-',
      )
      const requestDetailsObject = {
        serverTime: strftime('%d/%b/%Y %H:%M:%S %z', end),
        serverIP: request.connection.remoteAddress,
        serverXIP: xip,
        requestURL: request.url,
        requestMethod: request.method,
        requestHeaders: headerItemList.join('\n'),
        requestData: dataSlab,
        requestUserAgent: encode(request.headers['user-agent'] || '-'),
        requestReferer: encode(request.headers.referer || '-'),
        responseCode: response.statusCode,
      }
      fs.appendFile(JSON_FILE_PATH, JSON.stringify(requestDetailsObject) + '\n', (err) => {})
    })
  })

  // start listening server
  console.log(`Listening on ${LISTEN_HOSTNAME}:${LISTEN_PORT}\n`)
  server.listen(LISTEN_PORT, LISTEN_HOSTNAME)
}
