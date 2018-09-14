#!/usr/bin/env node

const chalk = require('chalk');
const commander = require('commander');
const AWS = require('aws-sdk');
const _ = require('lodash');
const packageJson = require('./package.json');

let s3Bucket = null;
let s3BucketRegion = null;
let maxCount = 10;

const program = new commander.Command(Object.keys(packageJson.bin)[0])
  .version(packageJson.version)
  .arguments('<s3-bucket> <s3-bucket-region>')
  .action((entry1, entry2) => {
    s3Bucket = entry1;
    s3BucketRegion = entry2;
  })
  .usage(`${chalk.green('<s3-bucket>  <s3-bucket-region>')} [options]`)
  .option('-c, --count <n>', 'No. of backups to keep')
  .parse(process.argv);

if (!s3Bucket) {
  console.error('Please specify the s3 bucket name:');
  console.log(
    `  ${chalk.cyan(program.name())} ${chalk.green('<s3-bucket>  <s3-bucket-region>')}`
  );
  console.log();
  console.log(
    `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
  );
  process.exit(1);
}

if (!s3BucketRegion) {
  console.error('Please specify the s3 bucket region:');
  console.log(
    `  ${chalk.cyan(program.name())} ${chalk.green('<s3-bucket>  <s3-bucket-region>')}`
  );
  console.log();
  console.log(
    `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
  );
  process.exit(1);
}

if (program.count) {
  maxCount = program.count;
}

const s3 = new AWS.S3({
  credentials: new AWS.SharedIniFileCredentials({ profile: 'backup' }),
  region: s3BucketRegion,
});

s3.listObjectsV2({ Bucket: s3Bucket }, function(err, data) {
  if (err) console.log(err, err.stack);
  else {
    if (data.KeyCount > maxCount) {
      const files = _.orderBy(data.Contents, 'LastModified', 'desc');
      const filesToDelete = _.drop(files, maxCount);

      s3.deleteObjects(
        {
          Bucket: s3Bucket,
          Delete: {
            Objects: filesToDelete.map(function (entry) {
              return {
                Key: entry.Key,
              };
            }),
          },
        },
        function (err, data) {
          if (err) console.log(err, err.stack);
          else console.log(data);
        }
      );
    }
  }
});
