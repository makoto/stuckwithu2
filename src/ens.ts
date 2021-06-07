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

const NEW_OWNERS_SUBGRAPH_QUERY = gql`
  query newOwners($domains: [String]) {
    newOwners(orderBy:blockNumber, orderDirection:desc, where:{domain_in:$domains}){
      blockNumber
      domain{
        id
      }
    }
  }
`

const BLOCKS_SUBGRAPH_QUERY = gql`
  query blocks($blockNumbers:[BigInt]){
    blocks(where: {number_in: $blockNumbers}) {
      id
      number
      timestamp
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
    const reverseNames = []

    let registrationCounter = 0
    const addressDict = {}
    for (let i = 0; i < chunked.length; i++) {
      // for (let i = 0; i < 2; i++) {
      const element = chunked[i];
      
      const ensNames = await getEnsData(element)
      console.log(`${i} / ${chunked.length}`)
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
        addressDict[r.registrant.id] = {
          registrantAddress:r.registrant.id,
          name:`${r.labelName}.eth`,
          registrationDate:r.registrationDate
        }
        registrationCounter+=1
      })

      const nodes = element.map(a => namehash.hash(a.slice(2).toLowerCase() + ".addr.reverse") )
      // console.log({nodes})
      let { newOwners } = await request(url, NEW_OWNERS_SUBGRAPH_QUERY, {
        domains:nodes
      })
      const blockNumbers = _.uniq(newOwners.map(n => n.blockNumber))
      let { blocks } = await request('https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks', BLOCKS_SUBGRAPH_QUERY, {
        blockNumbers
      })

      
      const blocksDict = _.groupBy(blocks, 'number');
      // console.log({blocksDict})
      for (let l = 0; l < nodes.length; l++) {
        const node = nodes[l];
        const address = element[l].toLowerCase();
        const newOwner = newOwners.filter(n => {
          return n.domain.id === node
        })
        
        const blockNumber = newOwner && newOwner.length > 0 && newOwner[0].blockNumber
        let r = {address, node:nodes[l], reverseRecordSetBlockNumber:blockNumber, reverseRecordSetAt: blocksDict[blockNumber] && blocksDict[blockNumber][0].timestamp}
        // console.log(r)
        if(addressDict[address]){
          addressDict[address]= {...addressDict[address], ...r}
        }else{
          addressDict[address] = r
        }
        
        reverseNames.push(r)
      }

      // console.log({i, blockNumbers})
      // console.log(i, element.length, registrations.length)
    }
    console.log({addresses:addresses.length, reverseNamesLength:reverseNames.length})
    console.log({addressDict})
    // console.log({addresses:addresses.length, registrationCounter})
    const result = Object.values(addressDict).filter((a:any) => !!a.address ).map((r:any) => {
        return [ r.address, r.reverseRecordSetAt, r.registrationDate, r.name ]
    })


    console.log({addresses:addresses.length, result:result.length})
    fs.writeFileSync(`./data/output/${argv.name}registrationDates.csv`, result.map(i => i.join(',') ).join('\n'))
}
 
console.log(argv)
main()
