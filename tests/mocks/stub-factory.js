/**
 * Test double factory shared by the mock modules.
 *
 * Returns a jest.fn() extended with the sinon-style behaviour helpers the
 * mock modules and suites were written against (.resolves / .rejects /
 * .returns / .withArgs-tolerant), so jest matchers (toHaveBeenCalledTimes,
 * toHaveBeenCalledWith, ...) and sinon-style setup both work on the same
 * double.
 */
function createStub() {
  const fn = jest.fn();

  fn.resolves = (value) => {
    fn.mockImplementation(() => Promise.resolve(value));
    return fn;
  };

  fn.rejects = (value) => {
    fn.mockImplementation(() => Promise.reject(value));
    return fn;
  };

  fn.returns = (value) => {
    fn.mockImplementation(() => value);
    return fn;
  };

  fn.reset = () => {
    fn.mockReset();
    return fn;
  };

  return fn;
}

module.exports = { createStub };
