use anchor_lang::prelude::*;

#[account]
pub struct Store {
    pub owner: Pubkey,
    pub users: Vec<Pubkey>,
    pub donation: Vec<u64>,
}