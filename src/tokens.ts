const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
require('dotenv').config()
const argv = yargs(hideBin(process.argv)).argv
const fs = require('fs');
// const _ = require('lodash')
import _ from 'lodash'
import { fetchTokenholders } from './utils'

export const main = async () => {
    let address, limit
    if(argv.token){
      address = argv.token
    }else{
      throw('--token token address is missing')
    }
    if(argv.limit){
      limit = argv.limit
    }
    console.log({address})
    const holders = await fetchTokenholders(address)

    // fs.writeFileSync('./data/output/spaceStats.csv', spaceStats.map(i => i.join(',') ).join('\n'))
    // fs.writeFileSync('./data/output/votersStats.csv', votersStats.map(i => i.join(',') ).join('\n'))
  }
  console.log(argv)
  main()
    