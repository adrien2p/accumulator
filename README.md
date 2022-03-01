<!--lint disable awesome-list-item-->
<div align="center">
  <p align="center">
    <img alt="DDoS Clsuter" src="./assets/DDoS_Cluster-logopng.png"/>
  </p>
  
  <h1>DDoS Cluster</h1>
  
  <p>
       :wrench: Run DDoS with NodeJS using the cluster module :rocket:
  </p>
  
  <a href="https://www.buymeacoffee.com/adriendeperetti" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>
  
</div>

---

<div align="center">
  <a href="https://github.com/adrien2p/ddos-cluster/issues"><img src="https://img.shields.io/github/issues/adrien2p/ddos-clusterr?style=flat-square" alt="issues" height="18"></a>
  <a href="https://github.com/adrien2p/ddos-cluster/blob/main/LICENSE"><img src="https://img.shields.io/github/license/adrien2p/ddos-cluster?style=flat-square" alt="licence" height="18"></a>
  <a href="https://twitter.com/intent/tweet?text=Check%20this%20out!%20Run%20a%20DDoS%20attack%20in%20a%20NodeJS%20cluster&url=https://github.com/adrien2p/ddos-cluster"><img src="https://badgen.net/badge/icon/twitter?icon=twitter&label=Share%20it%20on" alt="twitter" height="18"></a>
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
</div>

# Getting started

You can just use this repository as a template to get the directory structure and its content
loaded.

# Configuration

Start by duplicate `data-test.json`and update its content to put the websites info in it.
Here is the example `data-test.json`.
````json
{
    "data": [
        {
            "host": "localhost",
            "port": "3000",
            "path": "/"
        },
        {
            "host": "localhost",
            "port": "3001",
            "path": "/"
        },
        {
            "host": "localhost",
            "port": "3002",
            "path": "/"
        }
    ]
}
````

Update the `config.json` file to customise the attack.
Here is the example `config.json`.
```json
{
    "requestPerBatch": "20",
    "logEveryMs": "100",
    "delayBetweenBatch": "0"
}
```

# Running a DDoS

## Tests

Run the following commands to be able to launch your servers and the DDoS attack on it.

```bash
npm run start-server:test
npm run start
```

## Production

After having updated your config in `config.json` and filled your `data.json`
add a new script in your `package.json` such as

```json
"scripts": {
  "start:prod": "node index.mjs ./data.json ./config.json"
}
```

Then run the new script added above.

```bash
npm run start:prod
```