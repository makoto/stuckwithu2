
const gr = require('graphql-request')
const { request, gql } = gr
const url = 'https://hub.snapshot.page/graphql'
const yargs = require('yargs/yargs')
require('dotenv').config()
const argv = require('yargs/yargs')(process.argv.slice(2))
  .option('name', {
    demandOption: true,
  })
  .argv
const fs = require('fs');
const _ = require('lodash')
import _ from 'lodash'
import {getEnsData} from './utils'


const SNAPSHOT_VOTES_BY_PARTICIPANTS_SUBGRAPH_QUERY = gql`
  query Votes($userAddresses: [String]) {
    votes(first: 1000, where: { voter_in: $userAddresses }) {
      id
      voter
      created
      choice
      space {
        id
        avatar
      }
    }
  }
`

export const main = async () => {
  let addresses = [], limit = 50
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
  if(argv.limit){
    limit = argv.limit
  }
  
  const name = argv.name
  const chunked = _.chunk(addresses, limit)
  const voters = {}
  const spaces = {}
  const reverseNames = {}
  console.log(`${name} has ${addresses.length} holders/voters`)
  for (let i = 0; i < chunked.length; i++) {
  // for (let i = 0; i < 2; i++) {
    const element = chunked[i];
    console.log(i, element.length)
    const ensNames = await getEnsData(element)
    for (let j = 0; j < element.length; j++) {
      const address = element[j];
      const name = ensNames[j];
      if(ensNames[j] !== ''){
        reverseNames[address] = name
      }
    }
    let result = await request(url, SNAPSHOT_VOTES_BY_PARTICIPANTS_SUBGRAPH_QUERY, {
      userAddresses:element
    })
    for (let j = 0; j < result.votes.length; j++) {
      const vote = result.votes[j];
      const voter = reverseNames[vote.voter] || vote.voter
      if(voters[voter]){
        voters[voter].push(vote)
      }else{
        voters[voter] = [vote]
      }
      if(spaces[vote.space.id]){
        if(vote.space.id === 'rallygov.eth'){
          console.log({vote})
        }
        spaces[vote.space.id].push(vote)
      }else{
        spaces[vote.space.id] = [vote]
      }
    }
  }
  console.log({
    spaces:Object.values(spaces).length,
    voters:Object.values(voters).length
  })
  let spaceStats = Object.keys(spaces).map(space => {
    const voters = _.uniq(spaces[space].map(s => s.voter))
    // votes, voters, space
    return [voters.length, spaces[space].length, space]
  }).sort((a, b) => b[0] - a[0])
  let votersStats = Object.keys(voters).map((v) => {
    return [voters[v].length, v]
  }).sort((a, b) => b[0] - a[0])
  console.log(`What other governance has ${name} community member particpated?`)
  console.log("rank \t voters \t votes \t snpashot space")
  spaceStats.slice(0,100).map((s, i) => {
    console.log(`${i + 1} \t ${s[0]} \t\t ${s[1]}\t ${s[2]}`)
  })
  console.log({spaceStats:spaceStats.slice(0,100), votersStats:votersStats.slice(0,100)})
  fs.writeFileSync(`./data/output/${name}spaceStats.csv`, spaceStats.map(i => i.join(',') ).join('\n'))
  fs.writeFileSync(`./data/output/${name}votersStats.csv`, votersStats.map(i => i.join(',') ).join('\n'))
}
console.log(argv)
main()

