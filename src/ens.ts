const gr = require('graphql-request')
const { request, gql } = gr
const url = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens'
require('dotenv').config()
const argv = require('yargs/yargs')(process.argv.slice(2))
  .option('user', {
    string: true,
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

  console.log({addresses:addresses.length})
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
    for (let i = 0; i < chunked.length; i++) {
      // for (let i = 0; i < 2; i++) {
      const element = chunked[i];
      // console.log(i, element.length)
      const ensNames = await getEnsData(element)
      
      // for (let j = 0; j < element.length; j++) {
      //   const address = element[j];
      //   const name = ensNames[j];
      //   if(ensNames[j] !== ''){
      //     reverseNames[address] = name
      //   }
      // }
      const labelNames = ensNames.map(e => e.split('.')[0] )
      // console.log({labelNames})
      let { registrations } = await request(url, REGISTRATIONS_SUBGRAPH_QUERY, {
        labelNames
      })
      registrations.map(r => {
        const string =  `${r.registrant.id} , ${r.labelName}.eth , ${r.registrationDate}`
        result.push(string)
      })
      // for (let j = 0; j < result.votes.length; j++) {
      //   const vote = result.votes[j];
      //   const voter = reverseNames[vote.voter] || vote.voter
      //   if(voters[voter]){
      //   voters[voter].push(vote)
      //   }else{
      //   voters[voter] = [vote]
      //   }
      //   if(spaces[vote.space.id]){
      //   if(vote.space.id === 'rallygov.eth'){
      //       console.log({vote})
      //   }
      //   spaces[vote.space.id].push(vote)
      //   }else{
      //   spaces[vote.space.id] = [vote]
      //   }
      // }
    }
    console.log(result)
}
 
console.log(argv)
main()
