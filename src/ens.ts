const gr = require('graphql-request')
import namehash from 'eth-ens-namehash';
const { request, gql } = gr
const url = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens'
require('dotenv').config()
const argv = require('yargs/yargs')(process.argv.slice(2))
  .option('name', {
    demandOption: true,
  })
  .argv

const fs = require('fs');
import _ from 'lodash'
import { getEnsData, getOrFetch, fetchTransactionCount } from './utils'
import { ethers } from 'ethers';

const REGISTRATIONS_SUBGRAPH_QUERY = gql`
  query Registrations($labelNames: [String]) {
    registrations(orderBy:registrationDate, orderDirection:desc, where:{labelName_in:$labelNames}){
      id
      labelName
      registrationDate
      registrant{
        id
      }
    }
  }
`


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

//   const transactions = []
//   for (let index = 0; index < addresses.length; index++) {
//   // for (let index = 0; index < 3; index++) {
//     const address = addresses[index];    
//     const ethereum = (await getOrFetch(`./data/transactions/${1}-${address}.json`, fetchTransactionCount, [address, 1]))
//     transactions.push(ethereum)
//     console.log(`${address} , ${ethereum.length}`)
//   }
    const limit = 50
    const chunked = _.chunk(addresses, limit)
    const voters = {}
    const spaces = {}
    const reverseNames = {}
    const result = []
    let registrationCounter = 0
    for (let i = 0; i < chunked.length; i++) {
      // for (let i = 0; i < 2; i++) {
      const element = chunked[i];
      
      const ensNames = await getEnsData(element)
      // console.log({ensNames})
      for (let j = 0; j < element.length; j++) {
        const address = element[j];
        const name = ensNames[j];
        if(name === '' || !name){
          console.log(`**** name not found for ${address}`, {name})
        }
      }
      const labelNames = ensNames.map(e => e && e.split('.')[0] ).filter(e => !!e )
      // console.log({labelNames})
      let { registrations } = await request(url, REGISTRATIONS_SUBGRAPH_QUERY, {
        labelNames
      })
      for (let k = 0; k < ensNames.length; k++) {
        const name = ensNames[k];
        const labelName = name && name.split('.')[0]
        if (!registrations.map(r => r.labelName).includes(labelName)){
          console.log(`*** ${labelName} for ${[element[k]]} has no registrations`)
        }        
      }
      registrations.map(r => {
        const string = [r.registrant.id , `${r.labelName}.eth` , r.registrationDate]
        // console.log(string)
        registrationCounter+=1
        result.push(string)
      })
      console.log(i, element.length, registrations.length)
    }
    console.log({addresses:addresses.length, registrationCounter})
    fs.writeFileSync(`./data/output/${argv.name}registrationDates.csv`, result.map(i => i.join(',') ).join('\n'))
}
 
console.log(argv)
main()
