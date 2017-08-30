#!/usr/bin/env bash
scope="@thinktank"
dir=$1
packageJson="${dir}/package.json"
safe=$(cat ${packageJson} | jq --arg scope ${scope}"/" '.name | startswith($scope)')
if [ $safe = false ]; then
  echo Then package name in ${packageJson} does not include the proper scope.  Expecting ${scope}.
  exit 1;
fi
npm publish ${dir} --access restricted
