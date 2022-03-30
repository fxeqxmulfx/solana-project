use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Store {
    pub owner: Pubkey,
    pub bank: Pubkey,
    pub users: Vec<Pubkey>,
    pub bump: u8,
}

impl Store {
    pub fn put_donate(&mut self, user: Pubkey) {
        if let None = self.users.iter().find(|u| u.to_bytes() == user.to_bytes()) {
            self.users.push(user)
        }
    }
}

#[account]
#[derive(Default)]
pub struct UserStore {
    pub user: Pubkey,
    pub donation: Vec<u64>,
    pub bank: Pubkey,
    pub bump: u8,
}

impl UserStore {
    pub fn put_donate(&mut self, lamports: u64) {
        self.donation.push(lamports)
    }
}
