import range from 'lodash/range'
import loop from './loop'
import JobsCollection from '../JobsCollection'
import job from '../job'
import Worker from '../Worker'
import initJobs from '../initJobs'
import sleep from '../helpers/sleep'
import JobsRepository from './JobsRepository'

describe('loop test', () => {
  const workers = range(1).map(index => new Worker({index}))

  it("should run a event job if it's in line", async () => {
    expect.assertions(1)
    await JobsCollection.await()
    await new Promise(resolve => {
      const aJob = job({
        type: 'event',
        run: async params => {
          expect(params.name).toBe('Nicolás')
          resolve()
        }
      })

      return initJobs({aJob}).then(async jobs => {
        JobsRepository.setJobs(jobs)
        await aJob({name: 'Nicolás'})
        loop({jobs, workers, runLoop: () => {}})
      })
    })
  })

  it("should run a recurrent job if it's in line", async () => {
    expect.assertions(3)
    await JobsCollection.await()

    await new Promise(resolve => {
      let count = 0
      const aJob = job({
        type: 'recurrent',
        runEvery: 1,
        run: async () => {
          count++
          expect(1).toBe(1)
          if (count === 3) {
            resolve()
          }
        }
      })

      return initJobs({aJob}).then(async jobs => {
        JobsRepository.setJobs(jobs)
        await sleep(10)
        await loop({jobs, workers})
        await sleep(10)
        await loop({jobs, workers})
        await sleep(10)
        await loop({jobs, workers})
      })
    })
  })

  it('long running task are retry only after they are finished', async () => {
    jest.useFakeTimers()
    //  expect.assertions(3)
    await JobsCollection.await()

    const getStats = async () => [
      await JobsRepository.getRunningJobsCount(),
      await JobsRepository.getPendingJobsCount(),
      await JobsRepository.getDelayedJobsCount()
    ]

    await new Promise(resolve => {
      const longRunningJob = job({
        type: 'recurrent',
        runEvery: 10 * 1000 * 60, // 10 minutes
        run: async () => {
          await sleep(20 * 1000 * 60) // 20 minutes
        }
      })

      return initJobs({longRunningJob}).then(async jobs => {
        JobsRepository.setJobs(jobs)

        await expect(getStats()).resolves.toEqual([0, 1, 0]) // before loop, one pending
        await loop({jobs, workers})
        jest.advanceTimersByTime(5 * 1000 * 60)
        await expect(getStats()).resolves.toEqual([1, 0, 0]) // 5 minutes pass, the job is running
        jest.advanceTimersByTime(10 * 1000 * 60)
        await expect(getStats()).resolves.toEqual([1, 0, 0]) // 15 minutes pass, the job is still running
        jest.advanceTimersByTime(10 * 1000 * 60)
        await new Promise(resolve => setImmediate(resolve)) // to avoid conflict between mock timer and promises.
        await expect(getStats()).resolves.toEqual([0, 0, 1]) // 25 minutes pass, the job is not running, a new job is delayed state.
        resolve()
      })
    })
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })
})
