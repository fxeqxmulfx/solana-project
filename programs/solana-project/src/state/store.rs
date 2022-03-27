use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Store {
    pub owner: Pubkey,
    pub users: Vec<Pubkey>,
    pub donation: Vec<u64>,
}

impl Store {
    pub fn put_donate(&mut self, user: Pubkey, donate: u64) {
        self.users.push(user);
        self.donation.push(donate);
    }

    pub fn get_donate(&self, key: &Pubkey) -> Vec<(&Pubkey, &u64)> {
        self.users.iter()
            .zip(self.donation.iter())
            .filter(|(key_, _)| key_.to_bytes().eq(&key.to_bytes()))
            .collect()
    }
}