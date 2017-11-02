#!/usr/bin/env bash
#TODO either hard code scope to private repo name, or update script and documentation for another arg
# scope="@my-private-repo"
dir=$1
packageJson="${dir}/package.json"
safe=$(cat ${packageJson} | jq --arg scope ${scope}"/" '.name | startswith($scope)')
if [ $safe = false ]; then
  echo Then package name in ${packageJson} does not include the proper scope.  Expecting ${scope}.
  exit 1;
fi
npm publish ${dir} --access restricted
