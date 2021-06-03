require('dotenv').config()
const argv = require('yargs/yargs')(process.argv.slice(2))
  .option('user', {
    string: true,
  })
  .argv

const fs = require('fs');
import _ from 'lodash'
import { getChainUsage } from './utils'
import { ethers } from 'ethers';

export const main = async () => {
  let addresses
  if(argv.csv){
    // expect that the first column contains the address
    addresses = _.slice(
        fs.readFileSync(argv.csv)
        .toString()
        .split('\n')
        .map(a => a.split(','))
        .map(a => a[0]), 1
    )
  }else if(argv.json){
  // expect the array of object with 'address' key
    addresses = JSON.parse(fs.readFileSync(argv.json).toString()).map(a => a.address )
  }else{
    throw('need --csv or --json')
  }

  console.log({addresses:addresses.length})
  let results = []
  let chains = {
    ethereum:0,
    polygon: 0,
    avalanche: 0,
    bsc: 0,
    fantom: 0,
    xdai:0
  }
  for (let index = 0; index < addresses.length; index++) {
  // for (let index = 0; index < 3; index++) {
    const address = addresses[index];    
    const result = await getChainUsage(ethers.utils.getAddress(address))
    Object.keys(result).map(r => {
      if(result[r] > 0){
        chains[r]+=1
      }
    })
    results.push(result)
    console.log({index, result, chains})
  }

}
 
console.log(argv)
main()
