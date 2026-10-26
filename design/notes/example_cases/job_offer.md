# Example cases

Here, I've written up an example case that should be converted into something that can be stored in the database, I guess?

It provides insight on what the cases look like. There will eventually be a UI to input these cases.

## The Job Offer

**Author:** Sophie Liu
**Case Name:** The Job Offer

**Issues:**

- Start date (continuous)
    - option name: January 1; universal value: 0 (0 days after the first date option)
    - option name: March 1; universal value: 59 (59 days after the first date option)
- Salary (continuous)
    - option name: $80K; universal value: 80,000
    - option name: $120K; universal value: 120,000
- Health Insurance (discrete, so no universal values)
    - option name: Full Coverage
    - option name: Half Coverage
    - option name: Not included
- Bonus (continuous)
    - option name: $0; universal value: 0
    - option name: $10K; universal value: 10,000
- Position title (discrete, no universal values)
    - option name: assistant manager
    - option name: senior manager
    - option name: director

**Roles:**

- Manon, the employer
    - With the payoffs:
        - for start date, Manon weights January 1 at 800 and March 1 at 0.
        - for salary, Manon weights $80K as 500 and $120K as 0.
        - for health insurance, Manon weights them all the same (0).
        - for bonus, Manon weights $0 at 100 and $10K at 0.
        - for position title, Manon weights assistant manager at 0, senior manager at 100, and director at 200.
    - And a BATNA of 1000.
- Hiro, the hiree
    - With the payoffs:
        - for start date, Hiro weights January 1 at 0 and March 1 at 300.
        - for salary, Hiro weights $80K as 0 and $120K as 600.
        - for health insurance, Hiro weights full coverage at 300, half coverage at 150, and not included at 0.
        - for bonus, Hiro weights $0 at 0 and $10K at 100.
        - for position title, Hiro weights assistant manager at 0, senior manager at 100, and director at 200.
    - And a BATNA of 1000.
