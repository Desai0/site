import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 2,
  duration: '10s',
};

export default function () {
  const response = http.get('https://desaichk.com');
  check(response, {
    'status is 200': result => result.status === 200,
    'response time below 1000 ms': result => result.timings.duration < 1000,
  });
  sleep(1);
}
