
const gr = require('graphql-request')
const { request, gql } = gr
const url = 'https://hub.snapshot.page/graphql'
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
require('dotenv').config()
const argv = yargs(hideBin(process.argv)).argv
const fs = require('fs');
// const _ = require('lodash')
import _ from 'lodash'
import {getEnsData} from './utils'


const SNAPSHOT_VOTES_BY_PARTICIPANTS_SUBGRAPH_QUERY = gql`
  query Votes($userAddresses: [String]) {
    votes(first: 1000, where: { voter_in: $userAddresses }) {
      id
      voter
      created
      proposal
      choice
      space {
        id
        avatar
      }
    }
  }
`

export const main = async () => {
  let input = [], limit = 50
  if(argv.csv){
    input = fs.readFileSync(argv.csv).toString().split('\n').map(a => a.split(','))
  }else{
    throw('--csv filename is missing')
  }
  if(argv.limit){
    limit = argv.limit
  }
  const addresses = _.slice(input.map(a => a[0]), 1)
  const chunked = _.chunk(addresses, limit)
  const voters = {}
  const spaces = {}
  const reverseNames = {}
  for (let i = 0; i < chunked.length; i++) {
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
  let spaceStats = Object.keys(spaces).map(space => [spaces[space].length, space]).sort((a, b) => b[0] - a[0])
  let votersStats = Object.keys(voters).map((v) => {
    return [voters[v].length, v]
  }).sort((a, b) => b[0] - a[0])
  console.log({spaceStats:spaceStats.slice(0,100), votersStats:votersStats.slice(0,100)})
  fs.writeFileSync('./data/output/spaceStats.csv', spaceStats.map(i => i.join(',') ).join('\n'))
  fs.writeFileSync('./data/output/votersStats.csv', votersStats.map(i => i.join(',') ).join('\n'))
}
console.log(argv)
main()

