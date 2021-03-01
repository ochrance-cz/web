/**
 * getJSON:  RESTful GET request returning JSON object(s)
 * @param options: http options object
 * @param callback: callback to pass the results JSON object(s) back
 */

const http = require("http");

module.exports.getJSON = (options, onResult) => {
  console.log("rest::getJSON");
  const port = http;

  let output = "";

  const req = port.request(options, (res) => {
    console.log(`${options.host} : ${res.statusCode}`);
    res.setEncoding("utf8");

    res.on("data", (chunk) => {
      output += chunk;
    });

    res.on("end", () => {
      let obj = JSON.parse(output);

      onResult(res.statusCode, obj);
    });
  });

  req.on("error", (err) => {
    // res.send('error: ' + err.message);
  });

  req.end();
};
