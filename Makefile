test:
	anchor test

devnet-deploy:
	cargo build-bpf
	solana program deploy target/deploy/solana_project.so -u devnet --program-id localnet/program.json --keypair localnet/bob.json --upgrade-authority localnet/bob.json

client-cli:
	cd app/cli; yarn install; yarn run dev
