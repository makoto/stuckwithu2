require('dotenv').config()
const argv = require('yargs/yargs')(process.argv.slice(2))
  .option('user', {
    string: true
  })
  .argv

const fs = require('fs');
// const _ = require('lodash')
import _ from 'lodash'
import { fetchNFTs } from './utils'

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

  const nfts = {}
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    console.log({i, address})
    if(address.match(/^0x/)){
      const items = await fetchNFTs(address)
      _.uniqBy(items, 'contract_name').map(i => {
        if(nfts[i.contract_name]){
          nfts[i.contract_name].count+=1
        }else{
          const external_url = i.nft_data.length > 0 && i.nft_data[0].external_data && i.nft_data[0].external_data.external_url
          nfts[i.contract_name]={
            count:1,
            contract_name:i.contract_name,
            contract_address:i.contract_address,
            external_url
          }
        }
      })      
    }
  }

  Object.values(nfts).sort((a:any,b:any) => {
    return b.count - a.count
  }).map((a:any) => console.log(`${ a.count } : ${ a.contract_name } : ${ a.external_url }`))
}
console.log(argv)
main()
