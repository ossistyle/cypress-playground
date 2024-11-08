describe('Smoke #1', { tags: ['@smoke'] }, () => {
  before('#1 before', () => {
    cy.log('global before');
  });

  beforeEach(() => {
    cy.log('global beforeEach');
  });

  it('Test #1', () => {
    expect(true).to.be.true;
  });

  it('Test #3', () => {
    expect(true).to.be.true;
  });

  afterEach(() => {
    cy.log('global afterEach');
  });

  after(() => {
    cy.log('global after');
  });
});
