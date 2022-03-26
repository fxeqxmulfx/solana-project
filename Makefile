.PHONY: localnet client

localnet-validator:
	solana-test-validator -r --ledger localnet/ledger

localnet-init:
	solana airdrop 10 localnet/alice.json -u localhost
	solana airdrop 10 localnet/bob.json -u localhost

deploy:
	cargo build-bpf
	solana program deploy target/deploy/solana_project.so -u localhost --program-id localnet/program.json


testnet-deploy:
	cargo build-bpf
	solana program deploy target/deploy/solana_project.so -u testnet --program-id localnet/program.json --keypair localnet/alice.json --upgrade-authority localnet/alice.json


client-cli:
	cd client/cli; ./node_modules/.bin/ts-node main.ts


client-browser:
	cd client/browser; npm start