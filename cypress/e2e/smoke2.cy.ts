describe('Smoke #2', { failFast: { enabled: true }, tags: ['@smoke'] }, () => {
  before('#2 before', () => {
    cy.log('global before');
  });

  beforeEach('#2 beforeEach', () => {
    cy.log('global beforeEach');
  });

  it('Test #2.1', () => {
    expect(true).to.be.true;
  });

  it('Test #2.2', () => {
    expect(true).to.be.true;
  });

  it('Test #2.3', () => {
    expect(true).to.be.true;
  });

  afterEach(() => {
    cy.log('#2 afterEach');
  });

  after(() => {
    cy.log('#2 after');
  });
});
